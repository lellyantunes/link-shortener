const { supabase } = require('../lib/supabase');

// Gera slug aleatório
function generateSlug(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// Extrai domínio do host
function getDomain(req) {
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  return host.replace(/:\d+$/, ''); // Remove porta se tiver
}

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const domain = getDomain(req);

  // POST - Criar novo link
  if (req.method === 'POST') {
    try {
      const { url, slug, title } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
      }

      // Usa slug personalizado ou gera um
      const finalSlug = slug || generateSlug();

      // Verifica se slug já existe (global, não por domínio)
      const { data: existing } = await supabase
        .from('links')
        .select('slug')
        .eq('slug', finalSlug)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Slug já existe' });
      }

      // Cria o link vinculado ao domínio
      const { data, error } = await supabase
        .from('links')
        .insert({
          slug: finalSlug,
          destination_url: url,
          title: title || null,
          domain: domain
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
          created_at: data.created_at
        }
      });

    } catch (error) {
      console.error('Erro ao criar link:', error);
      return res.status(500).json({ error: 'Erro ao criar link' });
    }
  }

  // GET - Listar links DO DOMÍNIO ATUAL
  if (req.method === 'GET') {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const { data, error, count } = await supabase
        .from('links')
        .select('*', { count: 'exact' })
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      if (error) throw error;

      // Busca contagem de cliques para cada link
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
        links: linksWithStats
      });

    } catch (error) {
      console.error('Erro ao listar links:', error);
      return res.status(500).json({ error: 'Erro ao listar links' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
