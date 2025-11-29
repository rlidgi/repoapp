// Base44-style client wired to real services:
// - integrations.Core.InvokeLLM -> OpenAI (JSON prompts)
// - integrations.Core.GenerateImage -> Together (FLUX.1-schnell-Free)
// - entities.GeneratedImage -> in-memory store for dev (list/create/delete)

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
const TOGETHER_API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;
const TOGETHER_IMAGE_MODEL = import.meta.env.VITE_TOGETHER_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell-Free';

// Simple in-memory "db" for dev so Recent/Gallery render without a backend
let __generatedImages = [];

function toIsoDate(d = new Date()) {
  return d.toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOpenAIForPrompts(articleText) {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Set it in your .env file.');
  }

  const sys =
    'You are an expert prompt engineer for image generation models. ' +
    'Given an article, extract three distinct, highly descriptive, photorealistic image prompts suitable for professional publication. ' +
    'Each prompt should be standalone, specific, and renderable without the article context. ' +
    'Return only a JSON object with shape: {"prompts":[{"prompt":string,"relevance":string}]} and nothing else. ' +
    'Do not include any commentary, code fences, or additional keys.';

  const user =
    'Article:\n' +
    articleText +
    '\n\nProduce exactly 3 prompts. relevance should be one of: "high", "medium".';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ],
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned no content');
  }
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON from possible code fences or extra text
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : content;
    // Extract substring from first { to last }
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonSlice = candidate.slice(start, end + 1);
      try {
        parsed = JSON.parse(jsonSlice);
      } catch {
        // fall through
      }
    }
    if (!parsed) {
      throw new Error('OpenAI did not return valid JSON');
    }
  }
  const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
  return { prompts };
}

async function callTogetherForImageUrl(prompt, { maxRetries = 3 } = {}) {
  if (!TOGETHER_API_KEY) {
    throw new Error('Missing VITE_TOGETHER_API_KEY. Set it in your .env file.');
  }
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: TOGETHER_IMAGE_MODEL,
        prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
        guidance_scale: 3.5,
        response_format: 'url' // prefer direct URLs if available
      })
    });

    if (res.status === 429) {
      const header = res.headers.get('retry-after');
      const retryAfterSeconds = header ? parseInt(header, 10) : NaN;
      const backoffSeconds = Number.isFinite(retryAfterSeconds)
        ? Math.min(retryAfterSeconds, 20)
        : Math.min(5 * (attempt + 1), 20);
      if (attempt < maxRetries) {
        await sleep((backoffSeconds + Math.random()) * 1000);
        continue;
      }
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Together error ${res.status}: ${txt}`);
    }
    const data = await res.json();

    // Handle either URL or base64
    const first = data?.data?.[0];
    if (first?.url) {
      return first.url;
    }
    if (first?.b64_json) {
      try {
        const binary = atob(first.b64_json);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);
        return objectUrl;
      } catch {
        throw new Error('Failed to decode Together base64 image');
      }
    }
    // Some Together responses may use different shapes; try common alternatives
    const urlAlt = data?.output?.[0]?.image_url || data?.output?.[0]?.url;
    if (urlAlt) return urlAlt;

    throw new Error('Together response did not include an image URL or base64 data');
  }
  throw new Error('Rate limited by Together. Please try again shortly.');
}

export const base44 = {
  entities: {
    GeneratedImage: {
      async list(ordering = '-created_date', limit = 8) {
        const items = [...__generatedImages];
        const sortDesc = ordering === '-created_date';
        items.sort((a, b) => {
          const da = new Date(a.created_date).getTime();
          const db = new Date(b.created_date).getTime();
          return sortDesc ? db - da : da - db;
        });
        return items.slice(0, limit);
      },
      async create(data) {
        const record = {
          id: String(Date.now()),
          created_date: toIsoDate(),
          ...data,
        };
        __generatedImages.unshift(record);
        return record;
      },
      async delete(id) {
        __generatedImages = __generatedImages.filter(i => i.id !== id);
      },
    },
  },
  integrations: {
    Core: {
      // Standard mode: directly generate an image for the user's prompt
      async GenerateImage({ prompt }) {
        const url = await callTogetherForImageUrl(prompt);
        return { url };
      },
      // Article mode: use OpenAI to produce 3 prompts from the article
      async InvokeLLM({ prompt /* article text */, response_json_schema }) {
        // response_json_schema is not used directly here; we enforce JSON via response_format above
        return callOpenAIForPrompts(prompt);
      },
    },
  },
};
