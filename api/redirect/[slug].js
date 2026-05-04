const { supabase } = require('../../lib/supabase');

function getDevice(userAgent) {
  if (!userAgent) return 'unknown';
  userAgent = userAgent.toLowerCase();
  if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) return 'mobile';
  if (userAgent.includes('tablet') || userAgent.includes('ipad')) return 'tablet';
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
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function isAndroid(userAgent) {
  return userAgent && userAgent.toLowerCase().includes('android');
}

function isIOS(userAgent) {
  if (!userAgent) return false;
  userAgent = userAgent.toLowerCase();
  return userAgent.includes('iphone') || userAgent.includes('ipad');
}

function getAutoOpenPage(videoId, title, userAgent) {
  const youtubeUrl = `https://youtu.be/${videoId}`;
  const isAndroidDevice = isAndroid(userAgent);
  const isIOSDevice = isIOS(userAgent);
  
  // Intent URL para Android
  const androidIntent = `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;end`;
  
  // URL scheme para iOS
  const iosScheme = `youtube://www.youtube.com/watch?v=${videoId}`;
  
  // Vevo/YouTube URL que funciona melhor
  const universalLink = `https://www.youtube.com/watch?v=${videoId}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Abrindo...'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f0f;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #fff;
    }
    .loader {
      width: 50px;
      height: 50px;
      border: 4px solid #333;
      border-top-color: #ff0000;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .text { font-size: 16px; color: #888; margin-bottom: 30px; }
    .btn {
      display: none;
      background: #ff0000;
      color: #fff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 600;
    }
    .btn.show { display: inline-block; }
  </style>
</head>
<body>
  <div class="loader" id="loader"></div>
  <p class="text" id="text">Abrindo YouTube...</p>
  <a href="${youtubeUrl}" class="btn" id="btn">Toque para abrir</a>

  <script>
    (function() {
      var videoId = '${videoId}';
      var youtubeUrl = '${youtubeUrl}';
      var androidIntent = '${androidIntent}';
      var iosScheme = '${iosScheme}';
      var universalLink = '${universalLink}';
      var isAndroid = ${isAndroidDevice};
      var isIOS = ${isIOSDevice};
      
      var opened = false;
      var startTime = Date.now();
      
      function showButton() {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('text').textContent = 'Toque no botão abaixo:';
        document.getElementById('btn').classList.add('show');
      }
      
      function tryOpen(url) {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        setTimeout(function() {
          document.body.removeChild(iframe);
        }, 2000);
      }
      
      // Detecta se saiu da página (app abriu)
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          opened = true;
        }
      });
      
      window.addEventListener('blur', function() {
        opened = true;
      });
      
      // Tenta abrir o app
      if (isAndroid) {
        // Android: tenta intent primeiro
        window.location.href = androidIntent;
        
        setTimeout(function() {
          if (!opened && Date.now() - startTime < 3000) {
            window.location.href = youtubeUrl;
          }
        }, 1500);
        
      } else if (isIOS) {
        // iOS: tenta Universal Link direto
        // Universal Links funcionam melhor que URL schemes no iOS moderno
        window.location.href = universalLink;
        
        setTimeout(function() {
          if (!opened) {
            showButton();
          }
        }, 2500);
        
      } else {
        // Desktop ou outro: redirect direto
        window.location.href = youtubeUrl;
      }
      
      // Fallback final: mostra botão depois de 3 segundos
      setTimeout(function() {
        if (!opened && !document.hidden) {
          showButton();
        }
      }, 3000);
      
    })();
  </script>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const { slug } = req.query;

  if (slug.match(/\.(ico|png|jpg|css|js)$/) || slug === 'favicon') {
    return res.status(404).end();
  }

  try {
    const { data: link, error } = await supabase
      .from('links')
      .select('id, destination_url, title')
      .eq('slug', slug)
      .single();

    if (error || !link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Link não encontrado</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h1>Link não encontrado</h1>
          <p>O link <strong>${slug}</strong> não existe.</p>
        </body>
        </html>
      `);
    }

    // Registra clique
    const clickData = {
      link_id: link.id,
      ip: getIP(req),
      user_agent: req.headers['user-agent'] || null,
      referer: req.headers['referer'] || null,
      country: getCountry(req),
      city: getCity(req),
      device: getDevice(req.headers['user-agent'])
    };
    supabase.from('clicks').insert(clickData).catch(console.error);

    const destinationUrl = ensureAbsoluteUrl(link.destination_url);
    const userAgent = req.headers['user-agent'] || '';
    const videoId = getYouTubeVideoId(destinationUrl);

    // Se é YouTube em mobile → página com auto-open
    if (videoId && (isAndroid(userAgent) || isIOS(userAgent))) {
      return res.status(200).send(getAutoOpenPage(videoId, link.title, userAgent));
    }

    // Se é YouTube desktop → youtu.be
    if (videoId) {
      return res.redirect(302, `https://youtu.be/${videoId}`);
    }

    // Outros links → redirect normal
    return res.redirect(302, destinationUrl);

  } catch (error) {
    console.error('Erro no redirect:', error);
    return res.status(500).send('Erro interno');
  }
};
