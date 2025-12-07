import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK for script usage
if (!admin.apps.length) {
  try {
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (saJson) {
      const raw = JSON.parse(saJson);
      const projectId = raw.project_id || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      const clientEmail = raw.client_email;
      const privateKey = (raw.private_key || '').replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      console.warn('No service account JSON found. Skipping dynamic gallery sitemap generation.');
    }
  } catch (e) {
    console.error('Failed to initialize Firebase Admin for sitemap:', e);
  }
}

const distDir = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  console.error('dist directory not found. Build the project before generating the sitemap.');
  process.exit(1);
}

const siteUrl =
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  'https://piclumo.com';

const routes = ['/', '/gallery', '/pricing', '/privacy', '/terms'];
const today = new Date().toISOString().slice(0, 10);

// Function to fetch all gallery IDs
async function getGalleryIds() {
  if (!admin.apps.length) return [];
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('gallery').orderBy('updated_at', 'desc').limit(5000).get();
    const ids = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      // Only include publicly visible items
      if (d.image_url) {
        // Use 'nid' if available, otherwise doc.id
        ids.push({
          id: d.nid || doc.id,
          lastmod: d.updated_at ? d.updated_at.slice(0, 10) : today
        });
      }
    });
    return ids;
  } catch (e) {
    console.error('Error fetching gallery items for sitemap:', e);
    return [];
  }
}

(async () => {
  // Static routes
  let urls = routes
    .map(
      (route) => `
  <url>
    <loc>${siteUrl.replace(/\/+$/, '')}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`
    )
    .join('\n');

  // Dynamic gallery routes
  if (admin.apps.length) {
    console.log('Fetching gallery items for sitemap...');
    const galleryItems = await getGalleryIds();
    console.log(`Found ${galleryItems.length} gallery items.`);
    const galleryUrls = galleryItems
      .map(
        (item) => `
  <url>
    <loc>${siteUrl.replace(/\/+$/, '')}/gallery/viewer?src=${encodeURIComponent(item.id)}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
      )
      .join('\n');
    urls += '\n' + galleryUrls;
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap.trim() + '\n', 'utf8');

  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl.replace(/\/+$/, '')}/sitemap.xml
`;

  fs.writeFileSync(path.join(distDir, 'robots.txt'), robots, 'utf8');

  console.log('Generated dist/sitemap.xml and dist/robots.txt');
  process.exit(0);
})();
