import express from 'express';
import admin from 'firebase-admin';
import { requireAuth } from './auth.js';
import { db } from '../firebaseAdmin.js';

export const usersRouter = express.Router();

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'yaronyaronlid@gmail.com';
function requireOwner(req, res, next) {
  const email = (req.user && req.user.email) || null;
  if (!email || email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

usersRouter.post('/users/upsert', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { email: emailBody, name } = req.body || {};
    const userRef = db.collection('users').doc(uid);
    const metricsRef = db.collection('metrics').doc('users');
    await db.runTransaction(async (tx) => {
      // Read all docs first
      const userSnap = await tx.get(userRef);
      await tx.get(metricsRef);
      const now = new Date().toISOString();
      if (!userSnap.exists) {
        // Create user if not exists
        tx.create(userRef, {
          uid,
          email: emailBody || null,
          name: name || null,
          created_date: now,
          last_login_date: now
        });
        // Atomic increment
        tx.set(
          metricsRef,
          { total: admin.firestore.FieldValue.increment(1) },
          { merge: true }
        );
      } else {
        tx.update(userRef, {
          email: emailBody || userSnap.data().email || null,
          name: name || userSnap.data().name || null,
          last_login_date: now
        });
      }
    });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'users upsert error', details: e.message });
  }
});

usersRouter.get('/users/stats', requireAuth, requireOwner, async (req, res) => {
  try {
    const metricsRef = db.collection('metrics').doc('users');
    const metricsSnap = await metricsRef.get();
    const total = (metricsSnap.exists && typeof metricsSnap.data().total === 'number')
      ? metricsSnap.data().total
      : 0;

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentSnap = await db
      .collection('users')
      .where('created_date', '>=', cutoff)
      .get();
    const last24h = recentSnap.size || 0;

    return res.json({ total, last24h });
  } catch (e) {
    return res.status(500).json({ error: 'users stats error', details: e.message });
  }
});

usersRouter.get('/users/list', requireAuth, requireOwner, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 500);
    const snap = await db
      .collection('users')
      .orderBy('created_date', 'desc')
      .limit(limit)
      .get();
    const users = [];
    snap.forEach((doc) => {
      const d = doc.data() || {};
      users.push({
        uid: d.uid || doc.id,
        email: d.email || null,
        name: d.name || null,
        created_date: d.created_date || null,
        last_login_date: d.last_login_date || null
      });
    });
    return res.json({ users });
  } catch (e) {
    return res.status(500).json({ error: 'users list error', details: e.message });
  }
});


