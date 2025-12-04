const { db } = require('../shared/firebaseAdmin');
const { requireAuth } = require('../shared/auth');

module.exports = async function (context, req) {
	try {
		const authed = await requireAuth(context);
		if (!authed) return; // response already set

		const OWNER_EMAIL = process.env.OWNER_EMAIL || 'yaronyaronlid@gmail.com';
		if (!authed.email || authed.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
			context.res = {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ error: 'Forbidden' }),
			};
			return;
		}

		const metricsRef = db.collection('metrics').doc('users');
		const metricsSnap = await metricsRef.get();
		const total = (metricsSnap.exists && typeof metricsSnap.data().total === 'number')
			? metricsSnap.data().total
			: 0;

		// Count new users in the last 24 hours
		const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const recentSnap = await db
			.collection('users')
			.where('created_date', '>=', cutoff)
			.get();
		const last24h = recentSnap.size || 0;

		context.res = {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ total, last24h })
		};
	} catch (e) {
		context.res = {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ error: 'users-stats error', details: e && e.message ? e.message : String(e) })
		};
	}
};


