# 🔗 Link Shortener API

Sistema de encurtamento de links com analytics completo.

## 🚀 Deploy no Vercel

### 1. Criar repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **"New repository"**
3. Nome: `link-shortener`
4. Clique em **"Create repository"**
5. Faça upload de todos os arquivos desta pasta

### 2. Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **"Add New" → "Project"**
3. Selecione o repositório `link-shortener`
4. Em **"Environment Variables"**, adicione:
   - `SUPABASE_URL` = `https://ghybtfwibrbkvzemandp.supabase.co`
   - `SUPABASE_SERVICE_KEY` = `sua_service_key_aqui`
5. Clique em **"Deploy"**

### 3. Configurar domínio

1. No Vercel, vá em **Settings → Domains**
2. Adicione: `lk.caiontreinos.com.br`
3. Na Cloudflare, adicione CNAME apontando para o Vercel

---

## 📡 API Endpoints

### Criar link
```
POST /api/links
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=xxxxx",
  "slug": "meu-link",        // opcional
  "title": "Meu vídeo"       // opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "link": {
    "id": "uuid",
    "slug": "meu-link",
    "short_url": "https://lk.caiontreinos.com.br/meu-link",
    "destination_url": "https://youtube.com/watch?v=xxxxx",
    "title": "Meu vídeo",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Listar links
```
GET /api/links?limit=50&offset=0
```

### Detalhes de um link
```
GET /api/link/{slug}
```

### Atualizar link
```
PUT /api/link/{slug}
Content-Type: application/json

{
  "url": "https://nova-url.com",
  "title": "Novo título"
}
```

### Deletar link
```
DELETE /api/link/{slug}
```

### Estatísticas
```
GET /api/stats/{slug}?days=30
```

**Resposta:**
```json
{
  "success": true,
  "link": { ... },
  "stats": {
    "total_clicks": 150,
    "clicks_in_period": 45,
    "period_days": 30,
    "by_day": { "2024-01-01": 5, "2024-01-02": 8 },
    "by_country": { "BR": 40, "US": 5 },
    "by_device": { "mobile": 35, "desktop": 10 },
    "by_referer": { "Direto": 20, "https://wa.me": 25 },
    "recent_clicks": [ ... ]
  }
}
```

---

## 🔧 Uso no n8n

### Criar link
- **HTTP Request**
- Method: POST
- URL: `https://lk.caiontreinos.com.br/api/links`
- Body (JSON):
```json
{
  "url": "{{ $json.url }}",
  "slug": "{{ $json.slug }}",
  "title": "{{ $json.title }}"
}
```

### Buscar estatísticas
- **HTTP Request**
- Method: GET
- URL: `https://lk.caiontreinos.com.br/api/stats/{{ $json.slug }}`

---

## 📱 UTMs e parâmetros

Os parâmetros são preservados automaticamente. Exemplo:

Link original:
```
https://exemplo.com/pagina?utm_source=whatsapp&utm_medium=link
```

Crie o link curto:
```json
{
  "url": "https://exemplo.com/pagina?utm_source=whatsapp&utm_medium=link",
  "slug": "promo-whats"
}
```

Quando alguém acessar `lk.caiontreinos.com.br/promo-whats`, será redirecionado para a URL completa com todas as UTMs.

---

## 📊 Analytics coletados

- Data/hora do clique
- País e cidade (via headers)
- Dispositivo (mobile/tablet/desktop)
- Referer (de onde veio)
- User-Agent completo
