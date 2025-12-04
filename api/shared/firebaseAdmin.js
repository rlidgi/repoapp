const admin = require('firebase-admin');

let initialized = false;
let projectIdFromInit = null;
if (!admin.apps.length) {
  try {
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (saJson) {
      const raw = JSON.parse(saJson);
      const projectId = raw.project_id || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      projectIdFromInit = projectId || null;
      const clientEmail = raw.client_email;
      const privateKey = (raw.private_key || '').replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      initialized = true;
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      initialized = true;
    }
  } catch (e) {
    console.error('Failed to initialize Firebase Admin (functions):', e);
    throw e;
  }
}

function getDefaultBucketName() {
  const explicit = process.env.FIREBASE_STORAGE_BUCKET;
  if (explicit) return explicit;
  const envProject =
    process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || projectIdFromInit || process.env.FIREBASE_PROJECT_ID;
  return envProject ? `${envProject}.appspot.com` : undefined;
}

module.exports = {
  adminApp: admin.app(),
  adminAuth: admin.auth(),
  db: admin.firestore(),
  storageBucket: admin.storage().bucket(getDefaultBucketName()),
  initialized,
};


