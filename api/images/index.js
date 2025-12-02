const { requireAuth } = require('../shared/auth');
const { db } = require('../shared/firebaseAdmin');

module.exports = async function (context, req) {
  const user = await requireAuth(context);
  if (!user) return; // context.res set in requireAuth
  try {
    const limit = Math.min(parseInt((req.query && req.query.limit) || '20', 10), 100);
    const uid = user.uid;
    const snap = await db
      .collection('images')
      .where('user_id', '==', uid)
      .orderBy('created_date', 'desc')
      .limit(limit)
      .get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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


