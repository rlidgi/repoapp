import React, { useEffect, useState } from 'react';
import { useSEO } from '@/seo/useSEO';

export default function Terms() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  useSEO({
    title: 'Terms and Conditions',
    description: 'Review the terms and conditions for using Piclumo.'
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/terms.html', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load terms.html (${res.status})`);
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
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
              {error}. Place your Termly Terms HTML at public/terms.html
            </div>
            <p className="text-sm text-slate-600">
              Paste the Terms & Conditions embed code from Termly into a new file at <code>public/terms.html</code>.
            </p>
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


