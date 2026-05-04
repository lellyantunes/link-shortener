const { supabase } = require('../../lib/supabase');

function getDevice(ua) {
  if (!ua) return 'unknown';
  ua = ua.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
}

function getYouTubeId(url) {
  if (!url) return null;
  var m = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

module.exports = async (req, res) => {
  var slug = req.query.slug;
  
  if (!slug || slug === 'favicon' || /\.(ico|png|jpg|css|js)$/.test(slug)) {
    return res.status(404).end();
  }

  try {
    var { data: link } = await supabase
      .from('links')
      .select('id, destination_url')
      .eq('slug', slug)
      .single();

    if (!link) {
      return res.status(404).send('Link nao encontrado');
    }

    // Salva clique async
    supabase.from('clicks').insert({
      link_id: link.id,
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0] || null,
      user_agent: req.headers['user-agent'] || null,
      referer: req.headers['referer'] || null,
      country: req.headers['x-vercel-ip-country'] || null,
      city: req.headers['x-vercel-ip-city'] || null,
      device: getDevice(req.headers['user-agent'])
    });

    // URL de destino
    var url = link.destination_url;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    // Se é YouTube, converte pra youtu.be
    var ytId = getYouTubeId(url);
    if (ytId) url = 'https://youtu.be/' + ytId;

    // Redirect 302 instantâneo
    return res.redirect(302, url);

  } catch (e) {
    return res.redirect(302, 'https://youtube.com');
  }
};
