import express from 'express';
import fetch from 'node-fetch';
import { requireAuth } from './auth.js';
import { db, getStorageBucket } from '../firebaseAdmin.js';
import admin from 'firebase-admin';

export const adminRouter = express.Router();

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'yaronyaronlid@gmail.com';
function requireOwner(req, res, next) {
  const email = (req.user && req.user.email) || null;
  if (!email || email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

async function resolveFinalUrl(url) {
  try {
    // HEAD then GET fallback
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (!r.ok || !r.url) {
      r = await fetch(url, { method: 'GET', redirect: 'follow' });
    }
    const ct = r.headers.get('content-type') || '';
    if (r.ok && r.url && /image\//i.test(ct)) return r.url;
    if (r.ok && r.url) return r.url;
    return url;
  } catch {
    return url;
  }
}

// POST /api/admin/images/backfill?limit=200
adminRouter.post('/admin/images/backfill', requireAuth, requireOwner, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '200', 10) || 200, 1000);
    const since = req.query.since ? String(req.query.since) : null; // ISO date

    let q = db.collection('images').orderBy('created_date', 'desc').limit(limit);
    if (since) {
      q = q.where('created_date', '>=', since);
    }
    const snap = await q.get();

    let scanned = 0;
    let updated = 0;
    const batch = db.batch();
    for (const doc of snap.docs) {
      scanned++;
      const d = doc.data() || {};
      const url = d.image_url || '';
      if (typeof url === 'string' && /together\.ai\/shrt/i.test(url)) {
        const resolved = await resolveFinalUrl(url);
        if (resolved && resolved !== url) {
          batch.update(doc.ref, { image_url: resolved });
          updated++;
        }
      }
    }
    if (updated > 0) {
      await batch.commit();
    }
    return res.json({ scanned, updated });
  } catch (e) {
    return res.status(500).json({ error: 'backfill error', details: e.message });
  }
});

// GET /api/admin/diagnostics - verify Firestore and Storage configuration
adminRouter.get('/admin/diagnostics', requireAuth, requireOwner, async (req, res) => {
  const result = {
    projectId: null,
    bucket: null,
    firestoreOk: false,
    storageOk: false,
    errors: {},
  };
  try {
    const app = admin.app();
    // Try to derive project id
    result.projectId =
      app?.options?.projectId ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      null;
  } catch (e) {
    result.errors.app = e?.message || String(e);
  }
  try {
    const testRef = db.collection('_diag').doc('write-test');
    await testRef.set({ ts: Date.now() }, { merge: true });
    const snap = await testRef.get();
    result.firestoreOk = snap.exists;
  } catch (e) {
    result.errors.firestore = e?.message || String(e);
  }
  try {
    const bucket = getStorageBucket();
    result.bucket = bucket?.name || null;
    // Attempt a simple metadata call; if it throws, credentials or bucket is wrong
    await bucket.getFiles({ maxResults: 1 });
    result.storageOk = true;
  } catch (e) {
    result.errors.storage = e?.message || String(e);
  }
  return res.json(result);
});


