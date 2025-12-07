import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Heart, Check } from 'lucide-react';

export default function BottomCarousel() {
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const trackRef = useRef(null);
  const { user } = useAuth();
  const [votes, setVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        let rnd = null;
        let items = [];
        try {
          rnd = await base44.gallery.random(100);
          items = Array.isArray(rnd?.items) ? rnd.items : [];
        } catch (e) {
          // ignore here; we'll try fallback next
        }
        // Fallback to top feed if random is empty or failed
        if (!items || items.length === 0) {
          try {
            const top = await base44.gallery.top(100);
            items = Array.isArray(top?.items) ? top.items : [];
          } catch (e2) {
            // keep items as empty; will set error below
          }
        }
        const mapped = (items || [])
          .filter((t) => t && t.image_url)
          .map((t) => ({ id: t.id, src: t.image_url, prompt: t.prompt || '', votes: t.votes || 0 }));
        if (!cancelled) setImages(mapped);
        if (!cancelled) setVotes(Object.fromEntries(mapped.map((m) => [m.id, m.votes || 0])));
        if (!cancelled && user && mapped.length > 0) {
          try {
            const { userVotes: umap } = await base44.gallery.getVotes(mapped.map((i) => i.id));
            if (!cancelled) setUserVotes(umap || {});
          } catch {
            /* ignore */
          }
        } else {
          setUserVotes({});
        }
        if (!cancelled && (!items || items.length === 0)) {
          setError('No images available');
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load images');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Note: No periodic re-randomization to avoid mid-scroll refresh interruptions

  useEffect(() => {
    (async () => {
      try {
        if (user && images.length > 0) {
          const { userVotes: umap } = await base44.gallery.getVotes(images.map((i) => i.id));
          setUserVotes(umap || {});
        } else {
          setUserVotes({});
        }
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  const track = useMemo(() => {
    if (!images || images.length === 0) return [];
    // Duplicate to create seamless scroll
    return images.concat(images);
  }, [images]);

  if (error || images.length === 0) return null;

  return (
    <div className="w-full border-t border-slate-200 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 relative z-20">
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation-name: marquee-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .marquee:hover .marquee-track {
          animation-play-state: paused;
        }
      `}</style>
      <div
        className="relative overflow-visible marquee"
        onMouseEnter={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused'; }}
        onMouseLeave={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running'; }}
      >
        <div
          className="flex gap-6 py-5 pb-10 marquee-track"
          style={{
            width: 'max-content',
            animationDuration: images.length > 0 ? `${Math.max(20, images.length * 0.8)}s` : '20s',
          }}
          ref={trackRef}
        >
          {track.map((it, idx) => (
            <div
              key={idx}
              className="relative flex-none rounded-xl overflow-hidden border border-slate-200 bg-white cursor-pointer group transition-transform duration-300 hover:scale-150 hover:z-10 origin-bottom"
              style={{ height: 234 }}
              title={it.prompt || 'Community image'}
              role="button"
              tabIndex={0}
              onClick={() => {
                const url = `/gallery/viewer?src=${encodeURIComponent(it.src)}&prompt=${encodeURIComponent(it.prompt || '')}`;
                window.open(url, '_blank', 'noopener');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const url = `/gallery/viewer?src=${encodeURIComponent(it.src)}&prompt=${encodeURIComponent(it.prompt || '')}`;
                  window.open(url, '_blank', 'noopener');
                }
              }}
            >
              <img
                src={it.src}
                alt={it.prompt ? `Community image: ${it.prompt.slice(0, 80)}` : 'Community image'}
                style={{ width: 'auto', height: '100%', objectFit: 'contain', objectPosition: 'center center', display: 'block', transition: 'transform 400ms' }}
                loading="lazy"
                className=""
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-[12px] leading-snug text-white drop-shadow">
                  {it.prompt || 'Community image'}
                </div>
              </div>
              {/* Hover voting controls */}
              <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="px-2 py-1 rounded-lg text-[11px] font-medium bg-white/90 text-slate-800">
                  {(votes[it.id] || 0)} {(votes[it.id] || 0) === 1 ? 'vote' : 'votes'}
                </div>
                <Button
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user) return;
                    const id = it.id;
                    base44.gallery.vote(id).then(() => {
                      setVotes((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
                      setUserVotes((prev) => ({ ...prev, [id]: true }));
                    }).catch((err) => {
                      const msg = err?.message || '';
                      if (/already_voted/i.test(msg)) {
                        setUserVotes((prev) => ({ ...prev, [id]: true }));
                      }
                    });
                  }}
                  disabled={!!userVotes[it.id]}
                  aria-label="Upvote image"
                  className={`h-8 rounded-xl ${userVotes[it.id] ? 'bg-green-600 hover:bg-green-600' : 'bg-violet-600 hover:bg-violet-700'} text-white`}
                >
                  {userVotes[it.id] ? <Check className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


