// Secure API-backed client. All model calls and persistence happen on the server.
import { auth } from '@/auth/firebase';

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL;
export const API_BASE = (() => {
  // Development: default to local API server
  if (import.meta.env.DEV && !RAW_API_BASE) {
    return 'http://localhost:8787';
  }
  // Allow explicit same-origin modes
  if (RAW_API_BASE && /^(same-origin|relative|\.|\/)$/i.test(RAW_API_BASE.trim())) {
    return '';
  }
  // Production default: same-origin if not provided
  if (!RAW_API_BASE) {
    return '';
  }
  const trimmed = RAW_API_BASE.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
})();

async function getIdTokenOrThrow() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return await user.getIdToken();
}

async function authFetch(path, init = {}, retryOn401 = true) {
  const token = await getIdTokenOrThrow();
  const baseHeaders = {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      'X-Firebase-Authorization': `Bearer ${token}`,
  };

  const tryFetch = async (base, overrideHeaders) => {
    return await fetch(`${base}${path}`, {
      ...init,
      headers: overrideHeaders || baseHeaders
    });
  };

  let res = null;
  try {
    res = await tryFetch(API_BASE);
  } catch (e) {
    res = null;
  }

  // Fallback for preview/prod when API is on localhost:8787 and not proxied
  if (!res || (res.status === 404 && API_BASE === '')) {
    try {
      const fallbackBase =
        (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost')
          ? 'http://localhost:8787'
          : (import.meta.env.VITE_API_BASE_FALLBACK || '');
      if (fallbackBase) {
        // eslint-disable-next-line no-console
        console.warn('Falling back to API base:', fallbackBase);
        res = await tryFetch(fallbackBase);
      }
    } catch {
      // ignore; will surface later
    }
  }

  // If response is OK but not JSON (likely HTML from SPA), try fallback to API
  if (res && res.ok && API_BASE === '') {
    const ct = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
    if (!/application\/json/i.test(ct)) {
      try {
        const fallbackBase =
          (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost')
            ? 'http://localhost:8787'
            : (import.meta.env.VITE_API_BASE_FALLBACK || '');
        if (fallbackBase) {
          // eslint-disable-next-line no-console
          console.warn('Retrying with API fallback due to non-JSON response');
          res = await tryFetch(fallbackBase);
        }
      } catch {
        // keep original res
      }
    }
  }

  if (!res) {
    throw new Error('Network error contacting API');
  }
  if (res.status === 401 && retryOn401) {
    // Force refresh token and retry once
    const fresh = await auth.currentUser.getIdToken(true);
    const freshHeaders = {
        ...(init.headers || {}),
        Authorization: `Bearer ${fresh}`,
        'X-Firebase-Authorization': `Bearer ${fresh}`,
    };
    let res2 = null;
    try {
      res2 = await tryFetch(API_BASE, freshHeaders);
    } catch {
      res2 = null;
    }
    if (!res2 || (res2.status === 404 && API_BASE === '')) {
      const fallbackBase =
        (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost')
          ? 'http://localhost:8787'
          : (import.meta.env.VITE_API_BASE_FALLBACK || '');
      if (fallbackBase) {
        res2 = await tryFetch(fallbackBase, freshHeaders);
      }
    }
    return res2;
  }
  return res;
}

export const base44 = {
  entities: {
    GeneratedImage: {
      async list(ordering = '-created_date', limit = 8) {
        const res = await authFetch(`/api/images?limit=${encodeURIComponent(limit)}`);
        if (!res.ok) {
          let details = '';
          try {
            details = await res.text();
          } catch {}
          const msg = `List images failed (${res.status})${details ? `: ${details}` : ''}`;
          throw new Error(msg);
        }
        const data = await res.json();
        const items = data.items || [];
        if (ordering === '-created_date') return items;
        return items.slice().reverse();
      },
      async create(data) {
        // Not used in secure flow (server creates on generate)
        throw new Error('Client-side create disabled');
      },
      async delete(id) {
        // Optional: implement DELETE on server and call it here
        throw new Error('Delete not implemented on server');
      },
      async listAll() {
        return this.list('-created_date', 100);
      },
      async listByUser(userId) {
        // Server returns only current user's images based on token
        return this.list('-created_date', 1000);
      },
    },
  },
  integrations: {
    Core: {
      async GenerateImage({ prompt, mode = 'prompt', article_excerpt }) {
        const res = await authFetch(`/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, mode, article_excerpt })
        });
        if (!res.ok) {
          let msg = '';
          try {
            const err = await res.json();
            msg = err?.error || '';
          } catch {}
          if (!msg) {
            msg = `Request failed (${res.status} ${res.statusText || ''})`.trim();
          }
          throw new Error(msg);
        }
        const saved = await res.json();
        return { url: saved.image_url, saved };
      },
      async InvokeLLM({ prompt /* article text */ }) {
        const res = await authFetch(`/api/llm/prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleText: prompt })
        });
        if (!res.ok) {
          let msg = '';
          try {
            const err = await res.json();
            msg = err?.error || '';
          } catch {}
          if (!msg) {
            msg = `Request failed (${res.status} ${res.statusText || ''})`.trim();
          }
          throw new Error(msg);
        }
        return await res.json();
      },
    },
  },
  users: {
    async upsert({ email, name }) {
      let res = await authFetch(`/api/users/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      if (res.status === 404) {
        // Fallback to default function route name
        res = await authFetch(`/api/users-upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name })
        });
      }
      if (!res.ok) {
        let details = '';
        try { details = await res.text(); } catch {}
        throw new Error(`Upsert user failed (${res.status})${details ? `: ${details}` : ''}`);
      }
      return await res.json();
    },
    async stats() {
      let res = await authFetch(`/api/users/stats`, {
        method: 'GET'
      });
      if (res.status === 404) {
        // Fallback to default function route name
        res = await authFetch(`/api/users-stats`, { method: 'GET' });
      }
      if (!res.ok) {
        let details = '';
        try { details = await res.text(); } catch {}
        throw new Error(`Get user stats failed (${res.status})${details ? `: ${details}` : ''}`);
      }
      return await res.json();
    },
    async list({ limit = 100 } = {}) {
      let res = await authFetch(`/api/users/list?limit=${encodeURIComponent(limit)}`, {
        method: 'GET'
      });
      if (res.status === 404) {
        // Fallback to default function route name
        res = await authFetch(`/api/users-list?limit=${encodeURIComponent(limit)}`, { method: 'GET' });
      }
      if (!res.ok) {
        let details = '';
        try { details = await res.text(); } catch {}
        throw new Error(`List users failed (${res.status})${details ? `: ${details}` : ''}`);
      }
      return await res.json();
    }
  }
  ,
  admin: {
    async backfillResolve({ limit = 200, since } = {}) {
      const qs = new URLSearchParams();
      if (limit) qs.set('limit', String(limit));
      if (since) qs.set('since', String(since));
      // Try Express admin route first
      let res = await authFetch(`/api/admin/images/backfill?${qs.toString()}`, { method: 'POST' });
      if (res.status === 404) {
        // Fallback to Azure Function (correct route per function.json)
        res = await authFetch(`/api/images/backfill?${qs.toString()}`, { method: 'POST' });
      }
      if (!res.ok) {
        let details = '';
        try { details = await res.text(); } catch {}
        throw new Error(`Backfill failed (${res.status})${details ? `: ${details}` : ''}`);
      }
      return await res.json();
    },
    async diagnostics() {
      let res = await authFetch(`/api/admin/diagnostics`, { method: 'GET' });
      if (res.status === 404) {
        // Fallback to Azure Function
        res = await authFetch(`/api/admin-diagnostics`, { method: 'GET' });
        if (res.status === 404) {
          // Secondary fallback with alternate function name
          res = await authFetch(`/api/diagnostics`, { method: 'GET' });
        }
      }
      if (!res.ok) {
        let details = '';
        try { details = await res.text(); } catch {}
        throw new Error(`Diagnostics failed (${res.status})${details ? `: ${details}` : ''}`);
      }
      return await res.json();
    }
  }
};
