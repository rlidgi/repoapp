import express from 'express';
import { requireAuth } from './auth.js';
import { db } from '../firebaseAdmin.js';

export const imagesRouter = express.Router();

imagesRouter.get('/images', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const uid = req.user.uid;
    // Indexed query: requires composite index on (user_id asc, created_date desc)
    const snap = await db
      .collection('images')
      .where('user_id', '==', uid)
      .orderBy('created_date', 'desc')
      .limit(limit)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ error: 'List images error', details: e.message });
  }
});


