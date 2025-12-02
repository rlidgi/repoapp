const { adminAuth } = require('./firebaseAdmin');

async function requireAuth(ctx) {
  const authHeader = ctx.req.headers['authorization'] || ctx.req.headers['Authorization'] || '';
  const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
  if (!match) {
    ctx.res = { status: 401, jsonBody: { error: 'Missing token' } };
    return null;
  }
  const idToken = match[1];
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email || null };
  } catch (e) {
    console.error('verifyIdToken failed (functions):', e);
    const code = e?.errorInfo?.code || e?.code || 'auth/error';
    const message = e?.message || 'Invalid token';
    ctx.res = { status: 401, jsonBody: { error: 'Invalid token', code, message } };
    return null;
  }
}

module.exports = { requireAuth };


