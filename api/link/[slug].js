const { supabase } = require('../../lib/supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Detalhes de um link
  if (req.method === 'GET') {
    try {
      const { data: link, error } = await supabase
        .from('links')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !link) {
        return res.status(404).json({ error: 'Link não encontrado' });
      }

      // Busca contagem de cliques
      const { count: clicks } = await supabase
        .from('clicks')
        .select('*', { count: 'exact', head: true })
        .eq('link_id', link.id);

      return res.status(200).json({
        success: true,
        link: {
          ...link,
          short_url: `https://${req.headers.host}/${link.slug}`,
          clicks: clicks || 0
        }
      });

    } catch (error) {
      console.error('Erro ao buscar link:', error);
      return res.status(500).json({ error: 'Erro ao buscar link' });
    }
  }

  // DELETE - Remover link
  if (req.method === 'DELETE') {
    try {
      const { data: link, error: findError } = await supabase
        .from('links')
        .select('id')
        .eq('slug', slug)
        .single();

      if (findError || !link) {
        return res.status(404).json({ error: 'Link não encontrado' });
      }

      const { error } = await supabase
        .from('links')
        .delete()
        .eq('slug', slug);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Link removido com sucesso'
      });

    } catch (error) {
      console.error('Erro ao remover link:', error);
      return res.status(500).json({ error: 'Erro ao remover link' });
    }
  }

  // PUT - Atualizar link
  if (req.method === 'PUT') {
    try {
      const { url, title } = req.body;

      const updateData = {};
      if (url) updateData.destination_url = url;
      if (title !== undefined) updateData.title = title;

      const { data, error } = await supabase
        .from('links')
        .update(updateData)
        .eq('slug', slug)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        link: {
          ...data,
          short_url: `https://${req.headers.host}/${data.slug}`
        }
      });

    } catch (error) {
      console.error('Erro ao atualizar link:', error);
      return res.status(500).json({ error: 'Erro ao atualizar link' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
