// Azure Functions HTTP trigger for Termly-like LLM prompt generation via OpenAI Chat Completions API.
// Mirrors server/routes/generate.js -> POST /api/llm/prompts

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { requireAuth } = require('../shared/auth');

module.exports = async function (context, req) {
  const user = await requireAuth(context);
  if (!user) return;
  try {
    const body = req.body || {};
    const articleText = body.articleText;
    if (!articleText || typeof articleText !== 'string') {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'articleText required' })
      };
      return;
    }
    let OPENAI_KEY = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '').trim();
    // Accept keys accidentally stored with "Bearer " prefix
    if (OPENAI_KEY.toLowerCase().startsWith('bearer ')) {
      OPENAI_KEY = OPENAI_KEY.slice(7).trim();
    }
    if (!OPENAI_KEY) {
      context.res = {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'OpenAI key not configured' })
      };
      return;
    }
    // Log only metadata, not the key itself
    try { context.log('[llm-prompts] OPENAI key length:', OPENAI_KEY.length); } catch (_) {}
    const sys =
      'You are an expert prompt engineer for image generation models. ' +
      'Given an article, extract three distinct, highly descriptive, photorealistic image prompts suitable for professional publication. ' +
      'Each prompt should be standalone, specific, and renderable without the article context. ' +
      'Return only a JSON object with shape: {"prompts":[{"prompt":string,"relevance":string}]} and nothing else.';
    const userMsg = `Article:\n${articleText}\n\nProduce exactly 3 prompts. relevance should be one of: "high", "medium".`;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
        temperature: 0.7
      })
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      try { context.log('[llm-prompts] OpenAI error', r.status, txt && txt.slice ? txt.slice(0, 200) : ''); } catch (_) {}
      context.res = {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `OpenAI error ${r.status}`, details: txt })
      };
      return;
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content;
    let parsed = null;
    try { parsed = JSON.parse(content); } catch {
      const fenced = content?.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const candidate = fenced ? fenced[1] : content;
      const start = candidate?.indexOf('{');
      const end = candidate?.lastIndexOf('}');
      if (start >= 0 && end > start) parsed = JSON.parse(candidate.slice(start, end + 1));
    }
    const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
    context.res = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompts }) };
  } catch (e) {
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'LLM error', details: e.message })
    };
  }
};


