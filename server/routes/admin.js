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
    let archived = 0;
    const bucket = getStorageBucket();
    for (const doc of snap.docs) {
      scanned++;
      const d = doc.data() || {};
      const url = d.image_url || '';
      const isStorageUrl = /firebasestorage\.googleapis\.com/i.test(url);
      if (isStorageUrl) continue;
      const resolved = await resolveFinalUrl(url);
      try {
        const r = await fetch(resolved, { method: 'GET', redirect: 'follow' });
        if (!r.ok) throw new Error(`fetch ${r.status}`);
        const ct = r.headers.get('content-type') || 'image/jpeg';
        const ext =
          ct.includes('png') ? 'png' :
          ct.includes('jpeg') ? 'jpg' :
          ct.includes('jpg') ? 'jpg' :
          ct.includes('webp') ? 'webp' :
          'jpg';
        const buf = Buffer.from(await r.arrayBuffer());
        const uid = d.user_id || 'unknown';
        const filePath = `images/${uid}/${doc.id}.${ext}`;
        const token = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const file = bucket.file(filePath);
        await file.save(buf, {
          metadata: {
            contentType: ct,
            cacheControl: 'public, max-age=31536000',
            metadata: { firebaseStorageDownloadTokens: token },
          }
        });
        const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
        await doc.ref.set({
          image_url: storageUrl,
          source_url: d.source_url || resolved || url
        }, { merge: true });
        archived++;
      } catch {
        if (resolved && resolved !== url) {
          await doc.ref.set({ image_url: resolved }, { merge: true });
          updated++;
        }
      }
    }
    return res.json({ scanned, updated, archived });
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

// POST /api/admin/gallery/backfill?limit=200
adminRouter.post('/admin/gallery/backfill', requireAuth, requireOwner, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '200', 10) || 200, 1000);
    const snap = await db.collection('images').orderBy('created_date', 'desc').limit(limit).get();
    let scanned = 0;
    let created = 0;
    for (const doc of snap.docs) {
      scanned++;
      const d = doc.data() || {};
      const imgUrl = d.image_url;
      if (!imgUrl || typeof imgUrl !== 'string') continue;
      const rawId = `generated:${doc.id}`;
      const nid = (() => {
        try { return Buffer.from(String(rawId)).toString('base64url'); }
        catch { return Buffer.from(String(rawId)).toString('base64').replace(/[+/=]/g, '_'); }
      })();
      await db.collection('gallery').doc(nid).set({
        id: rawId,
        nid,
        image_url: imgUrl,
        rand: Math.random(),
        votes: 0,
        updated_at: new Date().toISOString()
      }, { merge: true });
      created++;
    }
    return res.json({ scanned, created });
  } catch (e) {
    return res.status(500).json({ error: 'gallery backfill error', details: e.message });
  }
});

// POST /api/admin/gallery/seed-votes?min=15&max=100
adminRouter.post('/admin/gallery/seed-votes', requireAuth, requireOwner, async (req, res) => {
  try {
    const min = Math.max(0, parseInt(req.query.min || '0', 10) || 0);
    const max = Math.max(min, parseInt(req.query.max || '50', 10) || 50);
    const snap = await db.collection('gallery').get();
    let updated = 0;
    const docs = snap.docs || [];
    // Batch in chunks to respect Firestore limits
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = db.batch();
      const slice = docs.slice(i, i + chunkSize);
      for (const d of slice) {
        const votes = Math.floor(Math.random() * (max - min + 1)) + min;
        batch.set(d.ref, { votes, updated_at: new Date().toISOString() }, { merge: true });
        updated++;
      }
      await batch.commit();
    }
    return res.json({ updated, range: { min, max } });
  } catch (e) {
    return res.status(500).json({ error: 'seed votes error', details: e.message });
  }
});

// POST /api/admin/gallery/assign-rand - add rand to gallery docs missing it
adminRouter.post('/admin/gallery/assign-rand', requireAuth, requireOwner, async (_req, res) => {
  try {
    const snap = await db.collection('gallery').get();
    let updated = 0;
    const docs = snap.docs || [];
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = db.batch();
      const slice = docs.slice(i, i + chunkSize);
      for (const d of slice) {
        const data = d.data() || {};
        if (typeof data.rand !== 'number') {
          batch.set(d.ref, { rand: Math.random() }, { merge: true });
          updated++;
        }
      }
      await batch.commit();
    }
    return res.json({ updated });
  } catch (e) {
    return res.status(500).json({ error: 'assign rand error', details: e.message });
  }
});

// POST /api/admin/gallery/delete  body: { id?: string, src?: string }
adminRouter.post('/admin/gallery/delete', requireAuth, requireOwner, async (req, res) => {
  try {
    const { id, src } = req.body || {};
    const toDelete = [];
    const deleted = { galleryDocs: 0, imageDocs: 0, storageFiles: 0 };
    if (id && typeof id === 'string') {
      // Normalize id to nid
      const rawId = String(id);
      const nid = (() => {
        try { return Buffer.from(rawId).toString('base64url'); }
        catch { return Buffer.from(rawId).toString('base64').replace(/[+/=]/g, '_'); }
      })();
      const ref = db.collection('gallery').doc(nid);
      const snap = await ref.get();
      if (snap.exists) toDelete.push(ref);
    }
    if (src && typeof src === 'string') {
      const q = await db.collection('gallery').where('image_url', '==', src).get();
      q.forEach((doc) => toDelete.push(doc.ref));
      // Also remove any image docs pointing to the same URL
      const q2 = await db.collection('images').where('image_url', '==', src).get();
      const imgRefs = [];
      q2.forEach((doc) => imgRefs.push(doc.ref));
      // Batch delete image docs
      if (imgRefs.length > 0) {
        const chunk = 400;
        for (let i = 0; i < imgRefs.length; i += chunk) {
          const batch = db.batch();
          imgRefs.slice(i, i + chunk).forEach((ref) => batch.delete(ref));
          await batch.commit();
          deleted.imageDocs += Math.min(chunk, imgRefs.length - i);
        }
      }
      // Attempt to delete storage object even if URL bucket format differs
      try {
        const bucket = getStorageBucket();
        // Expect format: https://firebasestorage.googleapis.com/v0/b/{bucketName}/o/{encodedPath}?...
        const url = new URL(src);
        if (/^firebasestorage\.googleapis\.com$/i.test(url.hostname)) {
          const segs = url.pathname.split('/').filter(Boolean);
          const oIndex = segs.findIndex((s) => s === 'o');
          if (oIndex >= 0 && segs[oIndex + 1]) {
            const encodedPath = segs[oIndex + 1];
            const objectPath = decodeURIComponent(encodedPath);
            if (bucket) {
              // Try delete regardless of bucket name differences (.appspot.com vs .firebasestorage.app)
              await bucket.file(objectPath).delete({ ignoreNotFound: true });
              deleted.storageFiles += 1;
            }
          }
        }
      } catch {
        // ignore storage delete errors
      }
    }
    if (toDelete.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    // Batch delete
    const chunk = 400;
    for (let i = 0; i < toDelete.length; i += chunk) {
      const batch = db.batch();
      toDelete.slice(i, i + chunk).forEach((ref) => batch.delete(ref));
      await batch.commit();
      deleted.galleryDocs += Math.min(chunk, toDelete.length - i);
    }
    return res.json({ deleted: toDelete.length, ...deleted });
  } catch (e) {
    return res.status(500).json({ error: 'delete error', details: e.message });
  }
});

// POST /api/admin/gallery/set-votes  body: { id?: string, src?: string, votes: number }
adminRouter.post('/admin/gallery/set-votes', requireAuth, requireOwner, async (req, res) => {
  try {
    const { id, src, votes, prompt } = req.body || {};
    const v = Number(votes);
    if (!Number.isFinite(v) || v < 0) return res.status(400).json({ error: 'votes must be a non-negative number' });
    const targets = [];
    if (src && typeof src === 'string') {
      const q = await db.collection('gallery').where('image_url', '==', src).limit(10).get();
      q.forEach((doc) => targets.push(doc.ref));
    }
    if (id && typeof id === 'string') {
      const nid = (() => {
        try { return Buffer.from(String(id)).toString('base64url'); }
        catch { return Buffer.from(String(id)).toString('base64').replace(/[+/=]/g, '_'); }
      })();
      targets.push(db.collection('gallery').doc(nid));
    }
    if (targets.length === 0) {
      // Create new gallery entry if not found and src provided
      if (src && typeof src === 'string') {
        const rawId = `external:${src}`;
        const nid = (() => {
          try { return Buffer.from(String(rawId)).toString('base64url'); }
          catch { return Buffer.from(String(rawId)).toString('base64').replace(/[+/=]/g, '_'); }
        })();
        await db.collection('gallery').doc(nid).set({
          id: rawId,
          nid,
          image_url: src,
          prompt: typeof prompt === 'string' ? prompt : null,
          votes: v,
          rand: Math.random(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { merge: true });
        return res.json({ updated: 0, created: 1, votes: v });
      }
      return res.status(404).json({ error: 'not_found' });
    }
    const chunk = 400;
    let updated = 0;
    for (let i = 0; i < targets.length; i += chunk) {
      const batch = db.batch();
      targets.slice(i, i + chunk).forEach((ref) => {
        batch.set(ref, { votes: v, updated_at: new Date().toISOString() }, { merge: true });
        updated++;
      });
      await batch.commit();
    }
    return res.json({ updated, votes: v });
  } catch (e) {
    return res.status(500).json({ error: 'set votes error', details: e.message });
  }
});


