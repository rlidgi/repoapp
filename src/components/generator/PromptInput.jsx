import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2 } from 'lucide-react';

export default function PromptInput({ value, onChange, onGenerate, isLoading, mode }) {
  const placeholders = {
    prompt: "Describe the image you want to create...\n\nBe detailed: style, colors, mood, composition",
    article: "Paste your article text here...\n\nWe'll analyze it and generate relevant images for your content"
  };

  const examples = useMemo(
    () => mode === 'prompt'
      ? [
          'a cozy reading nook by a window, golden hour light',
          'futuristic city street at night, neon rain, cinematic',
          'artisan sourdough loaf on rustic table, soft shadows'
        ]
      : [
          'Paste an opinion piece or blog post; we’ll generate 3 illustrations.',
          'Long-form content works best. Headlines and subheads help.'
        ],
    [mode]
  );

  const textarea = useRef(null);
  const didMountRef = useRef(false);
  const [history, setHistory] = useState([]);

  // Only focus when user changes mode, but avoid scrolling on initial mount
  useEffect(() => {
    if (didMountRef.current && textarea.current) {
      try {
        textarea.current.focus({ preventScroll: true });
      } catch {
        // no-op
      }
    } else {
      didMountRef.current = true;
    }
  }, [mode]);

  // Load history for current mode
  useEffect(() => {
    try {
      const key = mode === 'article' ? 'articleHistory' : 'promptHistory';
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  }, [mode]);

  const saveToHistory = (text) => {
    const clean = text.trim();
    if (!clean) return;
    const key = mode === 'article' ? 'articleHistory' : 'promptHistory';
    const next = [clean, ...history.filter((h) => h !== clean)].slice(0, 5);
    setHistory(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  const onKeyDown = (e) => {
    const isMetaEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
    if (isMetaEnter && !isLoading && value.trim()) {
      e.preventDefault();
      saveToHistory(value);
      onGenerate();
    }
  };

  const counts = useMemo(() => {
    if (mode === 'article') {
      const words = value.trim().length ? value.trim().split(/\s+/).length : 0;
      return `${words} ${words === 1 ? 'word' : 'words'}`;
    }
    const chars = value.length;
    return `${chars} ${chars === 1 ? 'char' : 'chars'}`;
  }, [value, mode]);

  return (
    <div className="space-y-4">
      <div className="relative group">
        <Textarea
          ref={textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholders[mode]}
          onKeyDown={onKeyDown}
          aria-label={mode === 'article' ? 'Article text' : 'Image prompt'}
          className="min-h-[180px] resize-none bg-white border-slate-200 rounded-2xl p-5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 text-base leading-relaxed"
        />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Example chips / helper text */}
      <div className="flex flex-wrap items-center gap-2">
        {examples.map((ex, i) => (
          <button
            type="button"
            key={i}
            onClick={() => onChange(ex)}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            {ex}
          </button>
        ))}
      </div>

      <Button
        onClick={() => {
          saveToHistory(value);
          onGenerate();
        }}
        disabled={!value.trim() || isLoading}
        className="w-full h-14 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium rounded-2xl shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 text-base"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {mode === 'article' ? 'Analyzing & Generating...' : 'Creating Magic...'}
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5 mr-2" />
            {mode === 'article' ? 'Generate Images from Article' : 'Generate Image'}
          </>
        )}
      </Button>
    </div>
  );
}
