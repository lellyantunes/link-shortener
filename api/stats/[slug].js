const { supabase } = require('../../lib/supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;
  const { days = 30 } = req.query;

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Busca o link
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('*')
      .eq('slug', slug)
      .single();

    if (linkError || !link) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    // Data de corte
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Total de cliques
    const { count: totalClicks } = await supabase
      .from('clicks')
      .select('*', { count: 'exact', head: true })
      .eq('link_id', link.id);

    // Cliques no período
    const { data: clicks, error: clicksError } = await supabase
      .from('clicks')
      .select('*')
      .eq('link_id', link.id)
      .gte('clicked_at', cutoffDate.toISOString())
      .order('clicked_at', { ascending: false });

    if (clicksError) throw clicksError;

    // Agrupa por dia
    const clicksByDay = {};
    clicks.forEach(click => {
      const day = click.clicked_at.split('T')[0];
      clicksByDay[day] = (clicksByDay[day] || 0) + 1;
    });

    // Agrupa por país
    const clicksByCountry = {};
    clicks.forEach(click => {
      const country = click.country || 'Desconhecido';
      clicksByCountry[country] = (clicksByCountry[country] || 0) + 1;
    });

    // Agrupa por dispositivo
    const clicksByDevice = {};
    clicks.forEach(click => {
      const device = click.device || 'Desconhecido';
      clicksByDevice[device] = (clicksByDevice[device] || 0) + 1;
    });

    // Top referers
    const clicksByReferer = {};
    clicks.forEach(click => {
      const referer = click.referer || 'Direto';
      clicksByReferer[referer] = (clicksByReferer[referer] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      link: {
        id: link.id,
        slug: link.slug,
        destination_url: link.destination_url,
        title: link.title,
        created_at: link.created_at
      },
      stats: {
        total_clicks: totalClicks || 0,
        clicks_in_period: clicks.length,
        period_days: parseInt(days),
        by_day: clicksByDay,
        by_country: clicksByCountry,
        by_device: clicksByDevice,
        by_referer: clicksByReferer,
        recent_clicks: clicks.slice(0, 10).map(c => ({
          clicked_at: c.clicked_at,
          country: c.country,
          city: c.city,
          device: c.device,
          referer: c.referer
        }))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};
