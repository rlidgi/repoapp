const admin = require('firebase-admin');
const { db, storageBucket } = require('../shared/firebaseAdmin');
const { requireAuth } = require('../shared/auth');

module.exports = async function (context, req) {
	try {
		const authed = await requireAuth(context);
		if (!authed) return; // response already set

		const OWNER_EMAIL = process.env.OWNER_EMAIL || 'yaronyaronlid@gmail.com';
		if (!authed.email || authed.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
			context.res = { status: 403, body: { error: 'Forbidden' } };
			return;
		}

		const result = {
			projectId: null,
			bucket: null,
			firestoreOk: false,
			storageOk: false,
			errors: {},
		};

		try {
			const app = admin.app();
			result.projectId =
				app?.options?.projectId ||
				process.env.FIREBASE_PROJECT_ID ||
				process.env.GCLOUD_PROJECT ||
				process.env.GCP_PROJECT ||
				null;
		} catch (e) {
			result.errors.app = e?.message || String(e);
		}

		try {
			const testRef = db.collection('_diag').doc('write-test');
			await testRef.set({ ts: Date.now() }, { merge: true });
			const snap = await testRef.get();
			result.firestoreOk = snap.exists;
		} catch (e) {
			result.errors.firestore = e?.message || String(e);
		}

		try {
			result.bucket = storageBucket?.name || null;
			await storageBucket.getFiles({ maxResults: 1 });
			result.storageOk = true;
		} catch (e) {
			result.errors.storage = e?.message || String(e);
		}

		context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) };
	} catch (e) {
		context.res = { status: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'diagnostics error', details: e && e.message ? e.message : String(e) }) };
	}
};


