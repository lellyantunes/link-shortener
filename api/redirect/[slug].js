const { supabase } = require('../../lib/supabase');

function getDevice(userAgent) {
  if (!userAgent) return 'unknown';
  userAgent = userAgent.toLowerCase();
  
  if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
    return 'mobile';
  }
  if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
    return 'tablet';
  }
  return 'desktop';
}

function getCountry(req) {
  return req.headers['x-vercel-ip-country'] || 
         req.headers['cf-ipcountry'] || 
         null;
}

function getCity(req) {
  return req.headers['x-vercel-ip-city'] || 
         req.headers['cf-ipcity'] ||
         null;
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress ||
         null;
}

// Garante URL absoluta
function ensureAbsoluteUrl(url) {
  if (!url) return url;
  if (!url.match(/^https?:\/\//i)) {
    return 'https://' + url;
  }
  return url;
}

// Converte YouTube para formato que abre no app
function convertToAppUrl(url) {
  // Padrões de YouTube que precisam converter pra youtu.be
  const youtubePatterns = [
    // youtube.com/watch?v=VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // youtube.com/watch?v=VIDEO_ID&outros_params
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    // youtube.com/v/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/embed/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/shorts/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Converte pra youtu.be que abre no app
      return `https://youtu.be/${match[1]}`;
    }
  }
  
  // Se já é youtu.be, mantém
  const youtubeShort = url.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (youtubeShort) {
    return `https://youtu.be/${youtubeShort[1]}`;
  }
  
  // Não é YouTube, retorna original
  return url;
}

module.exports = async (req, res) => {
  const { slug } = req.query;

  if (slug.includes('.') && !slug.includes('/')) {
    if (slug.match(/\.(ico|png|jpg|css|js)$/)) {
      return res.status(404).end();
    }
  }

  if (slug === 'favicon') {
    return res.status(404).end();
  }

  try {
    const { data: link, error } = await supabase
      .from('links')
      .select('id, destination_url')
      .eq('slug', slug)
      .single();

    if (error || !link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Link não encontrado</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h1>🔗 Link não encontrado</h1>
          <p>O link <strong>${slug}</strong> não existe ou foi removido.</p>
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

    supabase.from('clicks').insert(clickData).then(() => {}).catch(console.error);

    // Garante URL absoluta
    let destinationUrl = ensureAbsoluteUrl(link.destination_url);
    
    // Converte YouTube pra formato que abre no app
    destinationUrl = convertToAppUrl(destinationUrl);

    // Redirect 302
    return res.redirect(302, destinationUrl);

  } catch (error) {
    console.error('Erro no redirect:', error);
    return res.status(500).send('Erro interno');
  }
};
