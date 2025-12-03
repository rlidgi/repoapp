module.exports = async function (context, req) {
	try {
		const url = (req.query && req.query.url) ? String(req.query.url) : '';
		if (!url || !/^https?:\/\//i.test(url)) {
			context.res = { status: 400, body: { error: 'Invalid url' } };
			return;
		}

		// Use global fetch (Node 18+)
		const upstream = await fetch(url, { method: 'GET' });
		if (!upstream.ok) {
			const txt = await upstream.text().catch(() => '');
			context.res = { status: upstream.status, body: { error: 'Upstream fetch failed', details: txt } };
			return;
		}

		const arrayBuffer = await upstream.arrayBuffer();
		const body = Buffer.from(arrayBuffer);
		const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
		const extGuess =
			contentType.includes('png') ? 'png' :
			contentType.includes('jpeg') ? 'jpg' :
			contentType.includes('jpg') ? 'jpg' :
			contentType.includes('webp') ? 'webp' :
			'bin';

		context.res = {
			status: 200,
			isRaw: true,
			headers: {
				'Content-Type': contentType,
				'Content-Length': body.length,
				'Cache-Control': 'no-store',
				'Content-Disposition': `attachment; filename="image.${extGuess}"`
			},
			body
		};
	} catch (e) {
		context.res = { status: 500, body: { error: 'Proxy error', details: e && e.message ? e.message : String(e) } };
	}
};


