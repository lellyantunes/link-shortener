const { supabase } = require('../lib/supabase');

function getDomain(req) {
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  return host.replace(/:\d+$/, '');
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const domain = getDomain(req);

  // GET - Listar pastas
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('domain', domain)
        .order('name', { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        folders: data || []
      });

    } catch (error) {
      console.error('Erro ao listar pastas:', error);
      return res.status(500).json({ error: 'Erro ao listar pastas' });
    }
  }

  // POST - Criar pasta
  if (req.method === 'POST') {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da pasta é obrigatório' });
      }

      const folderName = name.trim();

      // Verifica se já existe
      const { data: existing } = await supabase
        .from('folders')
        .select('id')
        .eq('name', folderName)
        .eq('domain', domain)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Pasta já existe' });
      }

      const { data, error } = await supabase
        .from('folders')
        .insert({
          name: folderName,
          domain: domain
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        folder: data
      });

    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      return res.status(500).json({ error: 'Erro ao criar pasta' });
    }
  }

  // DELETE - Deletar pasta
  if (req.method === 'DELETE') {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nome da pasta é obrigatório' });
      }

      if (name === 'Geral') {
        return res.status(400).json({ error: 'Não é possível deletar a pasta Geral' });
      }

      // Move links da pasta para "Geral"
      await supabase
        .from('links')
        .update({ folder: 'Geral' })
        .eq('folder', name)
        .eq('domain', domain);

      // Deleta a pasta
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('name', name)
        .eq('domain', domain);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Pasta removida'
      });

    } catch (error) {
      console.error('Erro ao deletar pasta:', error);
      return res.status(500).json({ error: 'Erro ao deletar pasta' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
