const { db, storageBucket } = require('../shared/firebaseAdmin');
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
		let archived = 0;
		for (const doc of snap.docs) {
			scanned++;
			const d = doc.data() || {};
			const url = d.image_url || '';
			// Skip if already in Firebase Storage (download URL contains firebasestorage.googleapis.com or appspot.com bucket)
			const isStorageUrl = /firebasestorage\.googleapis\.com/i.test(url);
			if (isStorageUrl) continue;

			// Resolve short links first
			const resolved = await resolveFinalUrl(url);

			// Try to archive into Firebase Storage
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
				const file = storageBucket.file(filePath);
				await file.save(buf, {
					metadata: {
						contentType: ct,
						cacheControl: 'public, max-age=31536000',
						metadata: { firebaseStorageDownloadTokens: token },
					}
				});
				const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
				// Update doc: set image_url to storage, preserve old as source_url
				await doc.ref.set({
					image_url: storageUrl,
					source_url: d.source_url || resolved || url
				}, { merge: true });
				archived++;
			} catch {
				// As a fallback, if resolved changed, at least update the URL to the resolved value
				if (resolved && resolved !== url) {
					await doc.ref.set({ image_url: resolved }, { merge: true });
					updated++;
				}
			}
		}

		context.res = { status: 200, body: { scanned, updated, archived } };
	} catch (e) {
		context.res = { status: 500, body: { error: 'backfill error', details: e && e.message ? e.message : String(e) } };
	}
};


