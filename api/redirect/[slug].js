const { supabase } = require('../../lib/supabase');

// Detecta dispositivo a partir do User-Agent
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

module.exports = async (req, res) => {
  const { slug } = req.query;

  // Ignora favicons e arquivos
  if (slug.includes('.') || slug === 'favicon') {
    return res.status(404).end();
  }

  try {
    // Busca o link (slug é único globalmente)
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

    // Registra o clique (async, não bloqueia o redirect)
    const clickData = {
      link_id: link.id,
      ip: getIP(req),
      user_agent: req.headers['user-agent'] || null,
      referer: req.headers['referer'] || null,
      country: getCountry(req),
      city: getCity(req),
      device: getDevice(req.headers['user-agent'])
    };

    // Não espera salvar, redireciona imediato
    supabase.from('clicks').insert(clickData).then(() => {}).catch(console.error);

    // Redirect 302 (temporário)
    return res.redirect(302, link.destination_url);

  } catch (error) {
    console.error('Erro no redirect:', error);
    return res.status(500).send('Erro interno');
  }
};
