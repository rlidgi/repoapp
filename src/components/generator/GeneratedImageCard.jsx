import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Check, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { API_BASE } from '@/api/base44Client';
import { auth } from '@/auth/firebase';

export default function GeneratedImageCard({ image, delay = 0 }) {
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getProxyUrl = () => {
    const base = API_BASE || '';
    return `${base}/api/images/proxy?url=${encodeURIComponent(image.image_url)}`;
  };

  const handleDownload = async () => {
    try {
      const current = auth.currentUser;
      const token = current ? await current.getIdToken() : null;
      const res = await fetch(getProxyUrl(), {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              'X-Firebase-Authorization': `Bearer ${token}`,
            }
          : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback to opening original URL if authorized proxy fails
      handleOpenNew();
    }
  };

  const handleCopyUrl = () => {
    const text = image.image_url;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPrompt = () => {
    if (!image?.prompt) return;
    navigator.clipboard.writeText(image.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleOpenNew = () => {
    try {
      window.open(image.image_url, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
    >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="aspect-square overflow-hidden w-full focus:outline-none"
        aria-label="View image"
      >
        <img
          src={image.image_url}
          alt={image.prompt}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </button>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-white/90 text-sm line-clamp-2 mb-4 font-light">
            {image.prompt}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleDownload}
              size="sm"
              type="button"
              aria-label="Download image"
              className="h-9 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0 rounded-xl px-3"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleOpenNew}
              size="sm"
              variant="ghost"
              type="button"
              aria-label="Open in new window"
              className="h-9 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl px-3"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleCopyUrl}
              size="sm"
              variant="ghost"
              type="button"
              className="h-9 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl px-3"
              aria-label="Copy image URL"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mode badge */}
      {image.mode === 'article' && (
        <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-violet-700">
          From Article
        </div>
      )}

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Close"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={image.image_url}
            alt={image.prompt}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </motion.div>
  );
}
