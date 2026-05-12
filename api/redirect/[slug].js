const { supabase } = require('../../lib/supabase');

function getDevice(ua) {
  if (!ua) return 'unknown';
  ua = ua.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  if (ua.includes('mobile')) return 'mobile';
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

    const userAgent = req.headers['user-agent'] || '';
    const device = getDevice(userAgent);

    // Salva clique ANTES de retornar
    await supabase.from('clicks').insert({
      link_id: link.id,
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0] || null,
      user_agent: userAgent,
      referer: req.headers['referer'] || null,
      country: req.headers['x-vercel-ip-country'] || null,
      city: req.headers['x-vercel-ip-city'] || null,
      device: device
    });

    // URL de destino
    var url = link.destination_url;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    // Se é YouTube, força abrir no app
    var ytId = getYouTubeId(url);
    if (ytId) {
      if (device === 'android') {
        // Android Intent: abre app direto, fallback pro navegador
        const intentUrl = `intent://www.youtube.com/watch?v=${ytId}#Intent;package=com.google.android.youtube;scheme=https;end`;
        return res.redirect(302, intentUrl);
      } 
      
      if (device === 'ios') {
        // iOS: youtube:// scheme abre o app direto
        const iosUrl = `youtube://www.youtube.com/watch?v=${ytId}`;
        return res.redirect(302, iosUrl);
      }

      // Desktop ou outros: youtu.be
      url = 'https://youtu.be/' + ytId;
    }

    // Redirect padrão
    return res.redirect(302, url);

  } catch (e) {
    return res.redirect(302, 'https://youtube.com');
  }
};
