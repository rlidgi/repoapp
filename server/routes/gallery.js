import express from 'express';
import { requireAuth } from './auth.js';
import { db } from '../firebaseAdmin.js';
import fs from 'fs';
import path from 'path';

export const galleryRouter = express.Router();

// Dev helper: list pics from public/pics when manifest is missing
galleryRouter.get('/gallery/pics', async (_req, res) => {
  try {
    const picsDir = path.join(process.cwd(), 'public', 'pics');
    if (!fs.existsSync(picsDir)) return res.json({ images: [] });
    const files = fs.readdirSync(picsDir).filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f));
    const images = files.map((f) => `/pics/${f}`);
    return res.json({ images });
  } catch (e) {
    return res.status(500).json({ error: 'pics list error', details: e.message });
  }
});

function toDocId(rawId) {
  try {
    return Buffer.from(String(rawId)).toString('base64url');
  } catch {
    return Buffer.from(String(rawId)).toString('base64').replace(/[+/=]/g, '_');
  }
}

// GET /api/gallery/top?limit=20
galleryRouter.get('/gallery/top', async (req, res) => {
  try {
    const requested = parseInt(req.query.limit || '20', 10) || 20;
    // Fetch a larger pool so we can still return 20 storage-backed items
    const fetchLimit = 200;
    const snap = await db.collection('gallery').orderBy('votes', 'desc').limit(fetchLimit).get();
    const items = [];
    snap.forEach((doc) => {
      const d = doc.data() || {};
      if (d.image_url && typeof d.image_url === 'string') {
        items.push({
          id: d.id || '',
          nid: d.nid || doc.id,
          image_url: d.image_url,
          prompt: d.prompt || null,
          votes: d.votes || 0,
          created_at: d.created_at || d.createdAt || null,
          updated_at: d.updated_at || d.updatedAt || null
        });
      }
    });
    // Only include images archived in Firebase Storage to avoid temporary/expired links
    const isStorageUrl = (url) => /firebasestorage\.(googleapis\.com|app)/i.test(url || '');
    const valid = items.filter((it) => isStorageUrl(it.image_url));
    // Tie-breaker: prefer newer when votes are equal
    valid.sort((a, b) => {
      if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0);
      const ad = a.updated_at || a.updatedAt || '';
      const bd = b.updated_at || b.updatedAt || '';
      return String(bd).localeCompare(String(ad));
    });
    return res.json({ items: valid.slice(0, requested) });
  } catch (e) {
    return res.status(500).json({ error: 'top error', details: e.message });
  }
});

// GET /api/gallery/random?limit=20
galleryRouter.get('/gallery/random', async (req, res) => {
  try {
    const requested = parseInt(req.query.limit || '20', 10) || 20;
    const limit = Math.min(Math.max(requested, 1), 200);
    const threshold = Math.random();
    const items = [];
    // First range: rand >= threshold
    const q1 = await db.collection('gallery').where('rand', '>=', threshold).orderBy('rand', 'asc').limit(limit).get();
    q1.forEach((doc) => {
      const d = doc.data() || {};
      if (d.image_url && /firebasestorage\.googleapis\.com/i.test(d.image_url)) {
        items.push({
          id: d.id || '',
          nid: d.nid || doc.id,
          image_url: d.image_url,
          prompt: d.prompt || null,
          votes: d.votes || 0,
          rand: d.rand || 0,
        });
      }
    });
    if (items.length < limit) {
      const q2 = await db.collection('gallery').where('rand', '<', threshold).orderBy('rand', 'asc').limit(limit - items.length).get();
      q2.forEach((doc) => {
        const d = doc.data() || {};
        if (d.image_url && /firebasestorage\.googleapis\.com/i.test(d.image_url)) {
          items.push({
            id: d.id || '',
            nid: d.nid || doc.id,
            image_url: d.image_url,
            prompt: d.prompt || null,
            votes: d.votes || 0,
            rand: d.rand || 0,
          });
        }
      });
    }
    return res.json({ items: items.slice(0, limit) });
  } catch (e) {
    return res.status(500).json({ error: 'random error', details: e.message });
  }
});

// GET /api/gallery/votes?ids=a&ids=b
galleryRouter.get('/gallery/votes', requireAuth, async (req, res) => {
  try {
    const ids = Array.isArray(req.query.ids) ? req.query.ids : (req.query.ids ? [req.query.ids] : []);
    const uid = req.user.uid;
    const votes = {};
    const userVotes = {};
    if (ids.length === 0) return res.json({ votes, userVotes });
    const normIds = ids.map((id) => toDocId(id));
    const refs = normIds.map((nid) => db.collection('gallery').doc(nid));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, idx) => {
      const origId = ids[idx];
      votes[origId] = snap.exists ? (snap.data().votes || 0) : 0;
    });
    // fetch user vote markers
    const userRefs = normIds.map((nid) => db.collection('gallery_votes').doc(`${uid}:${nid}`));
    const userSnaps = await db.getAll(...userRefs);
    userSnaps.forEach((snap, idx) => {
      const origId = ids[idx];
      userVotes[origId] = snap.exists;
    });
    return res.json({ votes, userVotes });
  } catch (e) {
    return res.status(500).json({ error: 'votes error', details: e.message });
  }
});

// POST /api/gallery/vote { id }
galleryRouter.post('/gallery/vote', requireAuth, async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });
    const uid = req.user.uid;
    const nid = toDocId(id);
    const voteMarkerRef = db.collection('gallery_votes').doc(`${uid}:${nid}`);
    const aggRef = db.collection('gallery').doc(nid);

    await db.runTransaction(async (tx) => {
      // All reads before all writes
      const [marker, snap] = await Promise.all([tx.get(voteMarkerRef), tx.get(aggRef)]);
      if (marker.exists) throw new Error('already_voted');
      const current = snap.exists ? (snap.data().votes || 0) : 0;
      tx.set(voteMarkerRef, { uid, id, nid, created_at: new Date().toISOString() });
      tx.set(aggRef, { id, nid, votes: current + 1, updated_at: new Date().toISOString() }, { merge: true });
    });

    return res.json({ ok: true });
  } catch (e) {
    if (String(e.message) === 'already_voted') {
      return res.status(409).json({ error: 'already_voted' });
    }
    return res.status(500).json({ error: 'vote error', details: e.message });
  }
});


