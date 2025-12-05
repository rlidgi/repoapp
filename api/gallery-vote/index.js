const { db } = require('../shared/firebaseAdmin');
const { requireAuth } = require('../shared/auth');

module.exports = async function (context, req) {
	try {
		const authed = await requireAuth(context);
		if (!authed) return;
		const uid = authed.uid;
		const body = req.body || {};
		const id = typeof body.id === 'string' ? body.id : null;
		if (!id) {
			context.res = { status: 400, body: { error: 'id required' } };
			return;
		}
		function toDocId(rawId) {
			try { return Buffer.from(String(rawId)).toString('base64url'); }
			catch { return Buffer.from(String(rawId)).toString('base64').replace(/[+/=]/g, '_'); }
		}
		const nid = toDocId(id);
		const voteMarkerRef = db.collection('gallery_votes').doc(`${uid}:${nid}`);
		const aggRef = db.collection('gallery').doc(nid);

		await db.runTransaction(async (tx) => {
			// All reads before all writes
			const [marker, snap] = await Promise.all([tx.get(voteMarkerRef), tx.get(aggRef)]);
			if (marker.exists) throw new Error('already_voted');
			const current = snap.exists ? (snap.data().votes || 0) : 0;
			tx.set(voteMarkerRef, { uid, id, nid, created_at: new Date().toISOString() });
			tx.set(aggRef, { id, nid, votes: current + 1, updated_at: new Date().toISOString() }, { merge: true });
		});

		context.res = { status: 200, body: { ok: true } };
	} catch (e) {
		if (String(e.message) === 'already_voted') {
			context.res = { status: 409, body: { error: 'already_voted' } };
			return;
		}
		context.res = { status: 500, body: { error: 'vote error', details: e && e.message ? e.message : String(e) } };
	}
};


