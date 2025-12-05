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
    const body = req.body || {};
    const id = body.id && String(body.id);
    const src = body.src && String(body.src);
    const toDelete = [];
    if (id) {
      const nid = (() => {
        try { return Buffer.from(id).toString('base64url'); }
        catch { return Buffer.from(id).toString('base64').replace(/[+/=]/g, '_'); }
      })();
      const ref = db.collection('gallery').doc(nid);
      const snap = await ref.get();
      if (snap.exists) toDelete.push(ref);
    }
    if (src) {
      const q = await db.collection('gallery').where('image_url', '==', src).get();
      q.forEach((doc) => toDelete.push(doc.ref));
    }
    if (toDelete.length === 0) {
      context.res = { status: 404, body: { error: 'not_found' } };
      return;
    }
    const chunk = 400;
    for (let i = 0; i < toDelete.length; i += chunk) {
      const batch = db.batch();
      toDelete.slice(i, i + chunk).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    context.res = { status: 200, body: { deleted: toDelete.length } };
  } catch (e) {
    context.res = { status: 500, body: { error: 'delete error', details: e && e.message ? e.message : String(e) } };
  }
};


