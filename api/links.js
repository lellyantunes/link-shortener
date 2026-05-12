const { supabase } = require('../lib/supabase');

function generateSlug(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

function getDomain(req) {
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  return host.replace(/:\d+$/, '');
}

function normalizeUrl(url) {
  if (!url) return url;
  url = url.trim();
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }
  return url;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const domain = getDomain(req);

  // POST - Criar novo link
  if (req.method === 'POST') {
    try {
      const { url, slug, title, folder } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
      }

      const normalizedUrl = normalizeUrl(url);
      const finalSlug = slug || generateSlug();
      const finalFolder = folder || 'Geral';

      const { data: existing } = await supabase
        .from('links')
        .select('slug')
        .eq('slug', finalSlug)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Slug já existe' });
      }

      const { data, error } = await supabase
        .from('links')
        .insert({
          slug: finalSlug,
          destination_url: normalizedUrl,
          title: title || null,
          domain: domain,
          folder: finalFolder
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        link: {
          id: data.id,
          slug: data.slug,
          short_url: `https://${domain}/${data.slug}`,
          destination_url: data.destination_url,
          title: data.title,
          folder: data.folder,
          created_at: data.created_at
        }
      });

    } catch (error) {
      console.error('Erro ao criar link:', error);
      return res.status(500).json({ error: 'Erro ao criar link' });
    }
  }

  // GET - Listar links
  if (req.method === 'GET') {
    try {
      const { limit = 100, offset = 0, folder } = req.query;

      let query = supabase
        .from('links')
        .select('*', { count: 'exact' })
        .eq('domain', domain)
        .order('folder', { ascending: true })
        .order('created_at', { ascending: false });

      if (folder && folder !== 'Todas') {
        query = query.eq('folder', folder);
      }

      const { data, error, count } = await query
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;

      // Busca pastas da tabela folders
      const { data: foldersData } = await supabase
        .from('folders')
        .select('name')
        .eq('domain', domain)
        .order('name', { ascending: true });

      const folders = (foldersData || []).map(f => f.name);

      const linksWithStats = await Promise.all(
        (data || []).map(async (link) => {
          const { count: clicks } = await supabase
            .from('clicks')
            .select('*', { count: 'exact', head: true })
            .eq('link_id', link.id);

          return {
            ...link,
            short_url: `https://${domain}/${link.slug}`,
            clicks: clicks || 0
          };
        })
      );

      return res.status(200).json({
        success: true,
        total: count || 0,
        domain: domain,
        folders: folders,
        links: linksWithStats
      });

    } catch (error) {
      console.error('Erro ao listar links:', error);
      return res.status(500).json({ error: 'Erro ao listar links' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
