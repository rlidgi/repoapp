import express from 'express';
import { requireAuth } from './auth.js';
import { db } from '../firebaseAdmin.js';
import fetch from 'node-fetch';

export const imagesRouter = express.Router();

imagesRouter.get('/images', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const uid = req.user.uid;
    // Indexed query: requires composite index on (user_id asc, created_date desc)
    try {
      const snap = await db
        .collection('images')
        .where('user_id', '==', uid)
        .orderBy('created_date', 'desc')
        .limit(limit)
        .get();
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return res.json({ items });
    } catch (err) {
      // Fallback if composite index is missing: query by user only and sort in-memory
      const combined = [err?.code, err?.message].filter(Boolean).map(String).join(' ');
      const needsIndex = /failed[_\- ]?precondition|requires an index|index/i.test(combined);
      if (!needsIndex) {
        throw err;
      }
      const snap = await db
        .collection('images')
        .where('user_id', '==', uid)
        .limit(limit * 3) // overfetch then slice after sort
        .get();
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)))
        .slice(0, limit);
      return res.json({ items, note: 'using unindexed fallback' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'List images error', details: e.message });
  }
});

// Proxy remote image to enable reliable downloads (CORS-safe) and set attachment headers
imagesRouter.get('/images/proxy', requireAuth, async (req, res) => {
  try {
    const url = (req.query.url || '').toString();
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'Invalid url' });
    }
    // Basic safety: only allow common image extensions/content-types
    const upstream = await fetch(url, { method: 'GET' });
    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({ error: 'Upstream fetch failed', details: txt });
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await upstream.arrayBuffer());
    const extGuess =
      contentType.includes('png') ? 'png' :
      contentType.includes('jpeg') ? 'jpg' :
      contentType.includes('jpg') ? 'jpg' :
      contentType.includes('webp') ? 'webp' :
      'bin';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `attachment; filename="image.${extGuess}"`);
    return res.end(buf);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy error', details: e.message });
  }
});


