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

		const limit = Math.min(parseInt((req.query && req.query.limit) || '100', 10) || 100, 500);
		const snap = await db
			.collection('users')
			.orderBy('created_date', 'desc')
			.limit(limit)
			.get();

		const users = [];
		snap.forEach((doc) => {
			const d = doc.data() || {};
			users.push({
				uid: d.uid || doc.id,
				email: d.email || null,
				name: d.name || null,
				created_date: d.created_date || null,
				last_login_date: d.last_login_date || null
			});
		});

		context.res = {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ users })
		};
	} catch (e) {
		context.res = {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ error: 'users-list error', details: e && e.message ? e.message : String(e) })
		};
	}
};


