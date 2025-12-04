import admin from 'firebase-admin';

let app;
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
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      // Fallback to application default credentials (GOOGLE_APPLICATION_CREDENTIALS)
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e);
    throw e;
  }
}

export const adminApp = admin.app();
export const adminAuth = admin.auth();
export const db = admin.firestore();

function getDefaultBucketName() {
  const explicit = process.env.FIREBASE_STORAGE_BUCKET;
  if (explicit) return explicit;
  const envProject =
    process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || projectIdFromInit || process.env.FIREBASE_PROJECT_ID;
  return envProject ? `${envProject}.appspot.com` : undefined;
}

export function getStorageBucket() {
  const name = getDefaultBucketName();
  return admin.storage().bucket(name);
}


