const { db } = require('../shared/firebaseAdmin');
const { requireAuth } = require('../shared/auth');

function toDocId(rawId) {
	try { return Buffer.from(String(rawId)).toString('base64url'); }
	catch { return Buffer.from(String(rawId)).toString('base64').replace(/[+/=]/g, '_'); }
}

module.exports = async function (context, req) {
	try {
		const authed = await requireAuth(context);
		if (!authed) return;
		const OWNER_EMAIL = process.env.OWNER_EMAIL || 'yaronyaronlid@gmail.com';
		if (!authed.email || authed.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
			context.res = { status: 403, body: { error: 'Forbidden' } };
			return;
		}

		const limit = Math.min(parseInt((req.query && req.query.limit) || '200', 10) || 200, 1000);
		const snap = await db.collection('images').orderBy('created_date', 'desc').limit(limit).get();
		let scanned = 0;
		let created = 0;
		for (const doc of snap.docs) {
			scanned++;
			const d = doc.data() || {};
			const imgUrl = d.image_url;
			if (!imgUrl || typeof imgUrl !== 'string') continue;
			const rawId = `generated:${doc.id}`;
			const nid = toDocId(rawId);
			await db.collection('gallery').doc(nid).set({
				id: rawId,
				nid,
				image_url: imgUrl,
				prompt: d.prompt || null,
				votes: 0,
				updated_at: new Date().toISOString()
			}, { merge: true });
			created++;
		}
		context.res = { status: 200, body: { scanned, created } };
	} catch (e) {
		context.res = { status: 500, body: { error: 'gallery backfill error', details: e && e.message ? e.message : String(e) } };
	}
};


