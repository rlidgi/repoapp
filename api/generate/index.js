const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { requireAuth } = require('../shared/auth');
const { db, storageBucket } = require('../shared/firebaseAdmin');
const { getUserPlan, checkAndIncrementUsage } = require('../shared/usage');

module.exports = async function (context, req) {
  const user = await requireAuth(context);
  if (!user) return;
  try {
    const body = req.body || {};
    const prompt = body.prompt;
    const mode = body.mode || 'prompt';
    const article_excerpt = body.article_excerpt || null;
    if (!prompt || typeof prompt !== 'string') {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'prompt required' })
      };
      return;
    }
    const uid = user.uid;
    const plan = await getUserPlan(uid);
    const usage = await checkAndIncrementUsage(uid, plan);
    if (!usage.allowed) {
      context.res = {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'quota_exceeded', limits: usage.limits })
      };
      return;
    }
    const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
    const TOGETHER_IMAGE_MODEL = process.env.TOGETHER_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell-Free';
    if (!TOGETHER_API_KEY) {
      context.res = {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Together key not configured' })
      };
      return;
    }
    const r = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOGETHER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TOGETHER_IMAGE_MODEL,
        prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
        guidance_scale: 3.5,
        response_format: 'url'
      })
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      context.res = {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Together error ${r.status}`, details: txt })
      };
      return;
    }
    const data = await r.json();
    const first = data?.data?.[0];
    const imageUrl = first?.url || first?.image_url || (Array.isArray(first?.output) ? first?.output?.[0]?.url : undefined);
    if (!imageUrl) {
      context.res = {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No image URL from model' })
      };
      return;
    }

    // Resolve potential short link to a final URL
    async function resolveFinalUrl(url) {
      try {
        let rr = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        if (!rr.ok || !rr.url) {
          rr = await fetch(url, { method: 'GET', redirect: 'follow' });
        }
        const ct = rr.headers.get('content-type') || '';
        if (rr.ok && rr.url && /image\//i.test(ct)) return rr.url;
        if (rr.ok && rr.url) return rr.url;
      } catch {}
      return url;
    }
    const resolvedUrl = await resolveFinalUrl(imageUrl);

    // Pre-create doc id for stable storage path
    const ref = db.collection('images').doc();
    let finalImageUrl = resolvedUrl || imageUrl;
    const sourceUrl = resolvedUrl || imageUrl;
    try {
      // Download and upload to Firebase Storage
      const imgResp = await fetch(resolvedUrl, { method: 'GET', redirect: 'follow' });
      if (!imgResp.ok) throw new Error(`fetch-final-image ${imgResp.status}`);
      const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
      const ext =
        contentType.includes('png') ? 'png' :
        contentType.includes('jpeg') ? 'jpg' :
        contentType.includes('jpg') ? 'jpg' :
        contentType.includes('webp') ? 'webp' :
        'jpg';
      const buf = Buffer.from(await imgResp.arrayBuffer());
      const filePath = `images/${uid}/${ref.id}.${ext}`;
      const token = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const file = storageBucket.file(filePath);
      await file.save(buf, {
        metadata: {
          contentType,
          cacheControl: 'public, max-age=31536000',
          metadata: { firebaseStorageDownloadTokens: token },
        }
      });
      finalImageUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
    } catch (e) {
      // fall back to external URL
      // eslint-disable-next-line no-console
      console.error('Function storage archive failed, using external URL:', e?.message || e);
    }

    const doc = {
      user_id: uid,
      prompt,
      image_url: finalImageUrl,
      source_url: sourceUrl,
      mode,
      article_excerpt,
      created_date: new Date().toISOString(),
    };
    await ref.set(doc);
    context.res = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ref.id, ...doc }) };
  } catch (e) {
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Generate error', details: e.message })
    };
  }
};


