import React, { useEffect, useState } from 'react';
import { useSEO } from '@/seo/useSEO';

export default function Privacy() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  useSEO({
    title: 'Privacy Policy',
    description: 'Read how Piclumo collects, uses, and protects your information.'
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/privacy.html', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load privacy.html (${res.status})`);
        const text = await res.text();
        if (!cancelled) setHtml(text);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {error ? (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 break-all">
            {error}. Place your Termly HTML at public/privacy.html
          </div>
        ) : (
          <div
            className="prose prose-slate max-w-none break-words overflow-x-hidden"
            style={{ wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}


