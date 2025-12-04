const { db } = require('../shared/firebaseAdmin');
const { requireAuth } = require('../shared/auth');

async function resolveFinalUrl(url) {
	try {
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
		const since = (req.query && req.query.since) ? String(req.query.since) : null; // ISO date

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

		context.res = { status: 200, body: { scanned, updated } };
	} catch (e) {
		context.res = { status: 500, body: { error: 'backfill error', details: e && e.message ? e.message : String(e) } };
	}
};


