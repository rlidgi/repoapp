const { requireAuth } = require('../shared/auth');
const { db } = require('../shared/firebaseAdmin');

module.exports = async function (context, req) {
  const user = await requireAuth(context);
  if (!user) return; // context.res set in requireAuth
  try {
    const limit = Math.min(parseInt((req.query && req.query.limit) || '20', 10), 100);
    const uid = user.uid;
    let items = [];
    try {
      // Preferred: ordered by created_date desc (requires composite index)
      const snap = await db
        .collection('images')
        .where('user_id', '==', uid)
        .orderBy('created_date', 'desc')
        .limit(limit)
        .get();
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback: no orderBy -> avoids composite index requirement
      const snap = await db
        .collection('images')
        .where('user_id', '==', uid)
        .limit(limit)
        .get();
      items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)));
    }
    context.res = {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    };
  } catch (e) {
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'List images error', details: e.message })
    };
  }
};


