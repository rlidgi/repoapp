const { db } = require('../shared/firebaseAdmin');
const { requireAuth } = require('../shared/auth');

module.exports = async function (context, req) {
  const user = await requireAuth(context);
  if (!user) return;
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
  if (!user.email || user.email.toLowerCase() !== ownerEmail) {
    context.res = { status: 403, body: { error: 'Forbidden' } };
    return;
  }
  try {
    const min = Math.max(0, parseInt((req.query && req.query.min) || '0', 10) || 0);
    const max = Math.max(min, parseInt((req.query && req.query.max) || '50', 10) || 50);
    const snap = await db.collection('gallery').get();
    let updated = 0;
    const docs = snap.docs || [];
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
    context.res = { status: 200, body: { updated, range: { min, max } } };
  } catch (e) {
    context.res = { status: 500, body: { error: 'seed votes error', details: e && e.message ? e.message : String(e) } };
  }
};


