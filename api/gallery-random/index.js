const { db } = require('../shared/firebaseAdmin');

module.exports = async function (context, req) {
  try {
    const requested = parseInt((req.query && req.query.limit) || '20', 10) || 20;
    const limit = Math.min(Math.max(requested, 1), 200);
    const threshold = Math.random();
    const items = [];
    const isStorageUrl = (url) => /firebasestorage\.googleapis\.com/i.test(url || '');
    // rand >= threshold
    const q1 = await db.collection('gallery').where('rand', '>=', threshold).orderBy('rand', 'asc').limit(limit).get();
    q1.forEach((doc) => {
      const d = doc.data() || {};
      if (d.image_url && isStorageUrl(d.image_url)) {
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
        if (d.image_url && isStorageUrl(d.image_url)) {
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
    context.res = { status: 200, body: { items: items.slice(0, limit) } };
  } catch (e) {
    context.res = { status: 500, body: { error: 'random error', details: e && e.message ? e.message : String(e) } };
  }
};


