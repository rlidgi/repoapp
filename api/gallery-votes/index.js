const { db } = require('../shared/firebaseAdmin');
const { requireAuth } = require('../shared/auth');

module.exports = async function (context, req) {
	try {
		const authed = await requireAuth(context);
		if (!authed) return;
		const uid = authed.uid;

		function toDocId(rawId) {
			try { return Buffer.from(String(rawId)).toString('base64url'); }
			catch { return Buffer.from(String(rawId)).toString('base64').replace(/[+/=]/g, '_'); }
		}

		const ids = req.query && req.query.ids
			? (Array.isArray(req.query.ids) ? req.query.ids : [String(req.query.ids)])
			: [];

		const votes = {};
		const userVotes = {};
		if (ids.length === 0) {
			context.res = { status: 200, body: { votes, userVotes } };
			return;
		}
		const normIds = ids.map((id) => toDocId(id));
		const refs = normIds.map((nid) => db.collection('gallery').doc(nid));
		const snaps = await db.getAll(...refs);
		snaps.forEach((snap, idx) => {
			const origId = ids[idx];
			votes[origId] = snap.exists ? (snap.data().votes || 0) : 0;
		});
		const userRefs = normIds.map((nid) => db.collection('gallery_votes').doc(`${uid}:${nid}`));
		const userSnaps = await db.getAll(...userRefs);
		userSnaps.forEach((snap, idx) => {
			const origId = ids[idx];
			userVotes[origId] = snap.exists;
		});

		context.res = { status: 200, body: { votes, userVotes } };
	} catch (e) {
		context.res = { status: 500, body: { error: 'votes error', details: e && e.message ? e.message : String(e) } };
	}
};


