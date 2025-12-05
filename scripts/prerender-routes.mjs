import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';

// Lazy import puppeteer so Node loads faster when not used
async function getPuppeteer() {
	const puppeteer = await import('puppeteer');
	return puppeteer.default || puppeteer;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

// Skip prerender on CI/SWA environments where headless Chrome isn't available
if (process.env.SWAPRERENDER_DISABLED === 'true' || process.env.GITHUB_ACTIONS === 'true') {
	console.log('[prerender] Skipping prerender in CI environment');
	process.exit(0);
}

if (!fs.existsSync(distDir)) {
	console.error('dist/ not found. Run "npm run build" first.');
	process.exit(1);
}

// Start a tiny static server that serves the SPA from dist
function startStaticServer(port) {
	return new Promise((resolve) => {
		const app = express();
		app.use(express.static(distDir, { extensions: ['html'] }));
		// SPA fallback
		app.get('*', (_req, res) => {
			res.sendFile(path.join(distDir, 'index.html'));
		});
		const server = app.listen(port, () => resolve(server));
	});
}

async function prerender() {
  const routes = ['/', '/gallery', '/pricing', '/privacy', '/terms'];
	const port = process.env.PRERENDER_PORT ? Number(process.env.PRERENDER_PORT) : 5050;
	const baseUrl = `http://localhost:${port}`;

	const server = await startStaticServer(port);
	let browser = null;
	try {
		const puppeteer = await getPuppeteer();
		browser = await puppeteer.launch({
			headless: 'new',
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
	} catch (e) {
		console.warn('[prerender] Puppeteer launch failed, skipping prerender:', e?.message || e);
		await new Promise((r) => server.close(r));
		process.exit(0);
	}

	try {
		const page = await browser.newPage();
		// Ensure consistent viewport for social meta previews (not strictly required)
		await page.setViewport({ width: 1200, height: 630 });

		for (const route of routes) {
			const url = `${baseUrl}${route}`;
			await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

			// Allow client hooks (SEO) to update head tags
			await new Promise((r) => setTimeout(r, 500));

			const html = await page.evaluate(() => document.documentElement.outerHTML);

			// Write HTML to route-specific file
			const outDir = route === '/' ? distDir : path.join(distDir, route);
			if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
			const outFile = path.join(outDir, 'index.html');
			fs.writeFileSync(outFile, html, 'utf8');
			console.log(`Prerendered ${route} -> ${path.relative(process.cwd(), outFile)}`);
		}
	} finally {
		await browser.close();
		await new Promise((r) => server.close(r));
	}
}

prerender().catch((err) => {
	console.error(err);
	process.exit(1);
});


