import fetch from 'node-fetch';
import { requireAuth } from './auth.js';
import { getUserPlan, checkAndIncrementUsage } from '../utils/usage.js';
import { db } from '../firebaseAdmin.js';
import express from 'express';

export const generateRouter = express.Router();

generateRouter.post('/llm/prompts', requireAuth, async (req, res) => {
  try {
    const { articleText } = req.body || {};
    if (!articleText || typeof articleText !== 'string') {
      return res.status(400).json({ error: 'articleText required' });
    }
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI key not configured' });
    const sys =
      'You are an expert prompt engineer for image generation models. ' +
      'Given an article, extract three distinct, highly descriptive, photorealistic image prompts suitable for professional publication. ' +
      'Each prompt should be standalone, specific, and renderable without the article context. ' +
      'Return only a JSON object with shape: {"prompts":[{"prompt":string,"relevance":string}]} and nothing else.';
    const userMsg = `Article:\n${articleText}\n\nProduce exactly 3 prompts. relevance should be one of: "high", "medium".`;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
        temperature: 0.7
      })
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `OpenAI error ${r.status}`, details: txt });
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
    return res.json({ prompts });
  } catch (e) {
    return res.status(500).json({ error: 'LLM error', details: e.message });
  }
});

generateRouter.post('/generate', requireAuth, async (req, res) => {
  try {
    const { prompt, mode = 'prompt', article_excerpt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt required' });
    }
    const uid = req.user.uid;
    const plan = await getUserPlan(uid);
    const { allowed, limits } = await checkAndIncrementUsage(uid, plan);
    if (!allowed) {
      return res.status(403).json({ error: 'quota_exceeded', limits });
    }
    const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
    const TOGETHER_IMAGE_MODEL = process.env.TOGETHER_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell-Free';
    if (!TOGETHER_API_KEY) return res.status(500).json({ error: 'Together key not configured' });
    const r = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOGETHER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TOGETHER_IMAGE_MODEL,
        prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
        guidance_scale: 3.5,
        response_format: 'url'
      })
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return res.status(r.status).json({ error: `Together error ${r.status}`, details: txt });
    }
    const data = await r.json();
    const first = data?.data?.[0];
    const imageUrl = first?.url || first?.image_url || first?.output?.[0]?.url;
    if (!imageUrl) return res.status(502).json({ error: 'No image URL from model' });
    // Save image record
    const doc = {
      user_id: uid,
      prompt,
      image_url: imageUrl,
      mode,
      article_excerpt: article_excerpt || null,
      created_date: new Date().toISOString(),
    };
    const ref = await db.collection('images').add(doc);
    return res.json({ id: ref.id, ...doc });
  } catch (e) {
    return res.status(500).json({ error: 'Generate error', details: e.message });
  }
});


