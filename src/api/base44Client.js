// Secure API-backed client. All model calls and persistence happen on the server.
import { auth } from '@/auth/firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

async function getIdTokenOrThrow() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return await user.getIdToken();
}

async function authFetch(path, init = {}, retryOn401 = true) {
  const token = await getIdTokenOrThrow();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401 && retryOn401) {
    // Force refresh token and retry once
    const fresh = await auth.currentUser.getIdToken(true);
    const res2 = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${fresh}`,
      },
    });
    return res2;
  }
  return res;
}

export const base44 = {
  entities: {
    GeneratedImage: {
      async list(ordering = '-created_date', limit = 8) {
        const res = await authFetch(`/api/images?limit=${encodeURIComponent(limit)}`);
        if (!res.ok) throw new Error('Failed to list images');
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
          const err = await res.json().catch(() => ({}));
          const msg = err?.error || 'Generate failed';
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
          const err = await res.json().catch(() => ({}));
          const msg = err?.error || 'LLM failed';
          throw new Error(msg);
        }
        return await res.json();
      },
    },
  },
};
