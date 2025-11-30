import { adminAuth } from '../firebaseAdmin.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: 'Missing token' });
    const idToken = match[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    next();
  } catch (e) {
    // Helpful diagnostics in server logs
    console.error('verifyIdToken failed:', e);
    const code = e?.errorInfo?.code || e?.code || 'auth/error';
    const message = e?.message || 'Invalid token';
    return res.status(401).json({ error: 'Invalid token', code, message });
  }
}


