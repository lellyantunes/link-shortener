const { supabase } = require('../../lib/supabase');

function getDevice(userAgent) {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
}

function getCountry(req) {
  return req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || null;
}

function getCity(req) {
  return req.headers['x-vercel-ip-city'] || req.headers['cf-ipcity'] || null;
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || null;
}

function ensureAbsoluteUrl(url) {
  if (!url) return url;
  if (!url.match(/^https?:\/\//i)) return 'https://' + url;
  return url;
}

function getYouTubeVideoId(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function isMobile(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad');
}

function isAndroid(userAgent) {
  if (!userAgent) return false;
  return userAgent.toLowerCase().includes('android');
}

module.exports = async (req, res) => {
  const { slug } = req.query;

  if (!slug || slug === 'favicon' || slug.match(/\.(ico|png|jpg|css|js)$/)) {
    return res.status(404).end();
  }

  try {
    const { data: link, error } = await supabase
      .from('links')
      .select('id, destination_url, title')
      .eq('slug', slug)
      .single();

    if (error || !link) {
      return res.status(404).send('Link nao encontrado: ' + slug);
    }

    // Registra clique
    supabase.from('clicks').insert({
      link_id: link.id,
      ip: getIP(req),
      user_agent: req.headers['user-agent'] || null,
      referer: req.headers['referer'] || null,
      country: getCountry(req),
      city: getCity(req),
      device: getDevice(req.headers['user-agent'])
    }).catch(function(e) { console.error(e); });

    var destinationUrl = ensureAbsoluteUrl(link.destination_url);
    var userAgent = req.headers['user-agent'] || '';
    var videoId = getYouTubeVideoId(destinationUrl);

    // Se é YouTube em mobile -> página com auto-open
    if (videoId && isMobile(userAgent)) {
      var title = link.title || 'Abrindo video';
      var youtubeUrl = 'https://youtu.be/' + videoId;
      var watchUrl = 'https://www.youtube.com/watch?v=' + videoId;
      var androidIntent = 'intent://www.youtube.com/watch?v=' + videoId + '#Intent;package=com.google.android.youtube;scheme=https;end';
      var isAndroidDevice = isAndroid(userAgent);
      
      var html = '<!DOCTYPE html>' +
        '<html>' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>' + title + '</title>' +
        '<style>' +
        'body{font-family:sans-serif;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}' +
        '.loader{width:40px;height:40px;border:3px solid #333;border-top-color:#f00;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px}' +
        '@keyframes spin{to{transform:rotate(360deg)}}' +
        '.btn{display:inline-block;background:#f00;color:#fff;padding:16px 32px;border-radius:30px;text-decoration:none;font-size:18px;font-weight:bold;margin-top:20px}' +
        '</style>' +
        '</head>' +
        '<body>' +
        '<div class="loader" id="loader"></div>' +
        '<p id="msg">Abrindo YouTube...</p>' +
        '<a href="' + youtubeUrl + '" class="btn" id="btn" style="display:none">Abrir no YouTube</a>' +
        '<script>' +
        'var isAndroid=' + isAndroidDevice + ';' +
        'var youtubeUrl="' + youtubeUrl + '";' +
        'var watchUrl="' + watchUrl + '";' +
        'var intent="' + androidIntent + '";' +
        'setTimeout(function(){' +
        'document.getElementById("loader").style.display="none";' +
        'document.getElementById("msg").textContent="Toque no botao:";' +
        'document.getElementById("btn").style.display="inline-block";' +
        '},2500);' +
        'if(isAndroid){' +
        'window.location.href=intent;' +
        '}else{' +
        'window.location.href=watchUrl;' +
        '}' +
        '</script>' +
        '</body>' +
        '</html>';
      
      return res.status(200).send(html);
    }

    // Se é YouTube desktop -> youtu.be
    if (videoId) {
      return res.redirect(302, 'https://youtu.be/' + videoId);
    }

    // Outros links -> redirect normal
    return res.redirect(302, destinationUrl);

  } catch (err) {
    console.error('Erro:', err);
    return res.status(500).send('Erro: ' + (err.message || 'desconhecido'));
  }
};
