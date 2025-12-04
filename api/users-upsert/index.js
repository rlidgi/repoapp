const { db } = require('../shared/firebaseAdmin');
const admin = require('firebase-admin');
const { requireAuth } = require('../shared/auth');

module.exports = async function (context, req) {
	try {
		const authed = await requireAuth(context);
		if (!authed) return; // response already set

		const uid = authed.uid;
		const emailFromToken = authed.email || null;
		const body = (req && req.body) || {};
		const name = typeof body.name === 'string' ? body.name : null;
		const email = typeof body.email === 'string' ? body.email : emailFromToken;

		const userRef = db.collection('users').doc(uid);
		const metricsRef = db.collection('metrics').doc('users');

		await db.runTransaction(async (tx) => {
			// Read all docs first (sequential to be safe)
			const userSnap = await tx.get(userRef);
			await tx.get(metricsRef); // read metrics doc (we'll use atomic increment, so we don't need its value)

			const now = new Date().toISOString();
			if (!userSnap.exists) {
				// Create user (will fail if already exists)
				tx.create(userRef, {
					uid,
					email: email || null,
					name: name || null,
					created_date: now,
					last_login_date: now
				});
				// Atomic increment; no read of current value required
				tx.set(
					metricsRef,
					{ total: admin.firestore.FieldValue.increment(1) },
					{ merge: true }
				);
			} else {
				tx.update(userRef, {
					email: email || userSnap.data().email || null,
					name: name || userSnap.data().name || null,
					last_login_date: now
				});
			}
		});

		context.res = {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ok: true })
		};
	} catch (e) {
		context.res = {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ error: 'users-upsert error', details: e && e.message ? e.message : String(e) })
		};
	}
};


