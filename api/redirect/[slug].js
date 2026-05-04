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

    // Salva clique async
    supabase.from('clicks').insert({
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

    // Se é YouTube em mobile, usa página estilo Sendflow
    var ytId = getYouTubeId(url);
    if (ytId && (device === 'ios' || device === 'android' || device === 'mobile')) {
      var ytUrl = 'https://www.youtube.com/watch?v=' + ytId;
      
      var html = '<!DOCTYPE html>' +
        '<html lang="pt-br">' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta http-equiv="refresh" content="4; URL=\'' + ytUrl + '\'" />' +
        '<meta http-equiv="refresh" content="1; URL=\'' + ytUrl + '\'" />' +
        '<meta name="apple-mobile-web-app-capable" content="yes" />' +
        '<meta name="mobile-web-app-capable" content="yes" />' +
        '</head>' +
        '<body>' +
        '<script>' +
        'setTimeout(function(){' +
        'var u="' + ytUrl + '";' +
        'window.location.replace(u);' +
        'setTimeout(function(){window.location.replace(u);},500);' +
        '},100);' +
        '</script>' +
        '</body>' +
        '</html>';
      
      return res.status(200).send(html);
    }

    // Desktop ou outros: redirect normal
    if (ytId) {
      url = 'https://youtu.be/' + ytId;
    }
    
    return res.redirect(302, url);

  } catch (e) {
    return res.redirect(302, 'https://youtube.com');
  }
};
