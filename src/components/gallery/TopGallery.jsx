import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Heart, Check } from 'lucide-react';

export default function TopGallery() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Curated list: only show these four images (in this order)
  const curated = useMemo(() => ([
    {
      src: 'https://firebasestorage.googleapis.com/v0/b/cosmic-facility-438122-p7.firebasestorage.app/o/images%2F5NqxIEwPUwYLa7Dt9KIntJlm8xp2%2FoPu8213qCBjCb37blOO2.jpg?alt=media&token=c67d99d8-2c47-4696-8b40-84fdd191d9d8',
      prompt: 'Dramatic cinematic lighting on a single subject with text space on the side, deep shadows, attention-grabbing composition.'
    },
    {
      src: 'https://firebasestorage.googleapis.com/v0/b/cosmic-facility-438122-p7.firebasestorage.app/o/images%2F7aWM384SIMTu4pgsYOkK4VtuUED2%2FridpuxUasRoduYECQXgv.jpg?alt=media&token=67e79269-daab-4a95-910d-cf1283a97f5a',
      prompt: 'Surreal dreamy landscape with floating islands, pink clouds, soft sunlight, whimsical and magical atmosphere.'
    },
    {
      src: 'https://firebasestorage.googleapis.com/v0/b/cosmic-facility-438122-p7.firebasestorage.app/o/images%2Fc2PP7YvbbGZe1dGSDS4seCFwaU22%2FSD8I95b967wpmnDkQ2iy.jpg?alt=media&token=c76e639a-8ea2-4e04-ab60-d79e1d2e4484',
      prompt: 'Explosive color splash artwork with bold gradients, 3D liquid shapes, shimmering light reflections, hyperrealistic textures, extremely eye-catching and modern.'
    },
    {
      src: 'https://firebasestorage.googleapis.com/v0/b/cosmic-facility-438122-p7.firebasestorage.app/o/images%2F7aWM384SIMTu4pgsYOkK4VtuUED2%2FpyGF0xFOZEUPKVlkSdC6.jpg?alt=media&token=db775fc6-b00d-4f2c-a80b-cf0583f75cfb',
      prompt: 'Bold punchy colors, thick outlines, exaggerated lighting, expressive facial reaction, comic-style highlight strokes, extremely high contrast'
    }
  ]), []);

  const reload = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    let cancelled = false;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const normalize = (u) => {
        try {
          const url = new URL(u);
          return decodeURIComponent(url.origin + url.pathname);
        } catch {
          const idx = String(u).indexOf('?');
          return decodeURIComponent(idx >= 0 ? String(u).slice(0, idx) : String(u));
        }
      };
      // Fetch a larger pool then restrict to curated list (by exact image_url)
      const top = await base44.gallery.top(200);
      const apiItems = Array.isArray(top?.items) ? top.items : [];
      // Build lookup of real gallery items by normalized src
      const realByKey = new Map();
      for (const t of apiItems) {
        if (t && t.image_url) {
          const key = normalize(t.image_url);
          const existing = realByKey.get(key);
          if (!existing || ((t.votes || 0) > (existing.votes || 0))) {
            realByKey.set(key, t);
          }
        }
      }
      // Build selection strictly in curated order, preferring real docs (to display actual votes)
      const selected = curated.map((c) => {
        const key = normalize(c.src);
        const real = realByKey.get(key);
        if (real) {
          return {
            id: real.id,
            // Always display the curated image URL to avoid unintended substitutions
            src: c.src,
            votes: real.votes || 0,
            prompt: real.prompt || c.prompt || null
          };
        }
        // Fallback: synthetic (non-votable) entry
        return {
          id: `public:${c.src}`,
          src: c.src,
          votes: 0,
          prompt: c.prompt || null
        };
      });
      if (!cancelled) {
        setItems(selected);
        setVotes(Object.fromEntries(selected.map((m) => [m.id, m.votes || 0])));
        if (user && selected.length > 0) {
          const votableIds = selected
            .filter((i) => typeof i.id === 'string' && !i.id.startsWith('public:'))
            .map((i) => i.id);
          if (votableIds.length > 0) {
            const { userVotes: umap } = await base44.gallery.getVotes(votableIds);
            if (!cancelled) setUserVotes(umap || {});
          } else {
            setUserVotes({});
          }
        } else {
          setUserVotes({});
        }
      }
    } catch (e) {
      if (!cancelled && !silent) setError(e?.message || 'Failed to load gallery');
    } finally {
      if (!cancelled && !silent) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [user, curated]);

  useEffect(() => {
    const cleanup = reload();
    // Listen for manual refresh events only (no periodic or visibility-based refresh)
    const onRefresh = () => reload({ silent: true });
    window.addEventListener('gallery:refresh', onRefresh);
    return () => {
      try { typeof cleanup === 'function' && cleanup(); } catch {}
      window.removeEventListener('gallery:refresh', onRefresh);
    };
  }, [reload]);

  useEffect(() => {
    // Refresh votes when user auth state changes
    (async () => {
      try {
        if (user && items.length > 0) {
          const votableIds = items.filter((i) => typeof i.id === 'string' && !i.id.startsWith('public:')).map((i) => i.id);
          if (votableIds.length > 0) {
            const { userVotes: umap } = await base44.gallery.getVotes(votableIds);
            setUserVotes(umap || {});
          } else {
            setUserVotes({});
          }
        } else {
          setUserVotes({});
        }
      } catch (e) {
        // Ignore silent vote refresh errors
      }
    })();
  }, [user, items]); 

  const openViewer = useCallback((item) => {
    const url = `/gallery/viewer?src=${encodeURIComponent(item.src)}&prompt=${encodeURIComponent(item.prompt || '')}`;
    window.open(url, '_blank', 'noopener');
  }, []);

  const sortedTop = useMemo(() => {
    // Preserve curated order; just attach current votes
    return items.map((it) => ({ ...it, votes: votes[it.id] || 0 }));
  }, [items, votes]);

  async function onVote(id) {
    if (!user) {
      // Soft hint; voting requires sign-in handled elsewhere in app
      setError('Please sign in to vote');
      return;
    }
    try {
      await base44.gallery.vote(id);
      setVotes((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      setUserVotes((prev) => ({ ...prev, [id]: true }));
    } catch (e) {
      const msg = e?.message || '';
      if (/already_voted/i.test(msg)) {
        setUserVotes((prev) => ({ ...prev, [id]: true }));
      } else {
        setError('Vote failed. Try again.');
      }
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 mb-10">
        <div className="text-sm text-slate-600">Loading featured images…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-10">
        {error}
      </div>
    );
  }
  if (sortedTop.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Community Favorites</h2>
        <div className="text-sm text-slate-500">Top 20 by votes</div>
      </div>
      <div className="grid gap-6 grid-cols-2">
        {sortedTop.map((it) => {
          const voted = !!userVotes[it.id];
          const count = votes[it.id] || 0;
          return (
            <div
              key={it.id}
              className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 cursor-pointer"
              onClick={() => openViewer(it)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(it); } }}
            >
              <img
                src={it.src}
                alt={it.prompt ? `Community image: ${it.prompt.slice(0, 80)}` : 'Community image'}
                className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-x-0 top-0 p-3 opacity-100 transition-opacity duration-300">
                <div className="text-xs leading-snug text-white drop-shadow-sm">
                  {it.prompt || ' '}
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="px-2 py-1 rounded-lg text-xs font-medium bg-white/90 text-slate-800">
                  {count} {count === 1 ? 'vote' : 'votes'}
                </div>
                <Button
                  size="sm"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onVote(it.id); }}
                  disabled={voted || (typeof it.id === 'string' && it.id.startsWith('public:'))}
                  aria-label="Upvote image"
                  className={`h-8 rounded-xl ${voted ? 'bg-green-600 hover:bg-green-600' : 'bg-violet-600 hover:bg-violet-700'} text-white`}
                >
                  {voted ? <Check className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


