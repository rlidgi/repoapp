import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
	console.error('dist directory not found. Build the project before generating the sitemap.');
	process.exit(1);
}

const siteUrl =
	process.env.SITE_URL ||
	process.env.VITE_SITE_URL ||
	'http://localhost:5173';

const routes = ['/', '/gallery', '/pricing'];
const today = new Date().toISOString().slice(0, 10);

const urls = routes
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


