// ═══════════════════════════════════════════════════════════════════
// VIZZIO ASSESSMENT — Vercel Serverless Function
// ═══════════════════════════════════════════════════════════════════
// Esta função roda NO SERVIDOR (não no navegador).
// A chave da Anthropic fica em variável de ambiente do Vercel,
// NUNCA aparece no código, no GitHub ou no navegador do cliente.
// ═══════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS — permite o navegador chamar essa função
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Apenas POST é aceito' });
  }

  // Buscar chave da Anthropic na env var do Vercel
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error('[Vizzio AI] ANTHROPIC_API_KEY não configurada no Vercel');
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY não configurada no Vercel. Configure em Settings → Environment Variables.'
    });
  }

  if (!key.startsWith('sk-ant')) {
    console.error('[Vizzio AI] ANTHROPIC_API_KEY com formato inválido');
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY com formato inválido (deve começar com sk-ant)'
    });
  }

  try {
    const body = req.body || {};
    const prompt = body.prompt;
    const max_tokens = body.max_tokens || 1800;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Campo "prompt" é obrigatório (string)' });
    }

    console.log('[Vizzio AI] Chamando Anthropic | prompt length:', prompt.length);

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('[Vizzio AI] Anthropic erro:', anthropicRes.status, data);
      return res.status(anthropicRes.status).json({
        error: (data && data.error && data.error.message) || 'Erro da Anthropic API',
        status: anthropicRes.status
      });
    }

    const text = data && data.content && data.content[0] && data.content[0].text
      ? data.content[0].text
      : null;

    if (!text) {
      console.error('[Vizzio AI] Resposta sem texto:', data);
      return res.status(500).json({ error: 'Resposta da IA sem conteúdo' });
    }

    console.log('[Vizzio AI] ✅ Sucesso | response length:', text.length);
    return res.status(200).json({ text: text });

  } catch (err) {
    console.error('[Vizzio AI] Exceção:', err);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
