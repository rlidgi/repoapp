const { db } = require('../shared/firebaseAdmin');

module.exports = async function (context, req) {
	try {
		const requested = parseInt((req.query && req.query.limit) || '20', 10) || 20;
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
		valid.sort((a, b) => {
			if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0);
			const ad = a.updated_at || '';
			const bd = b.updated_at || '';
			return String(bd).localeCompare(String(ad));
		});
		context.res = { status: 200, body: { items: valid.slice(0, requested) } };
	} catch (e) {
		context.res = { status: 500, body: { error: 'top error', details: e && e.message ? e.message : String(e) } };
	}
};


