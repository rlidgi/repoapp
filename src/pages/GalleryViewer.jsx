import React from 'react';
import { useSearchParams } from 'react-router-dom';

export default function GalleryViewer() {
  const [params] = useSearchParams();
  const src = params.get('src') || '';
  const prompt = params.get('prompt') || 'Prompt unavailable';

  if (!src) {
    return (
      <div style={{ padding: 24 }}>
        <div>No image source provided.</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0b0c10',
      display: 'grid',
      placeItems: 'center',
      overflow: 'hidden',
      zIndex: 50
    }}>
      <img
        src={src}
        alt="Community image"
        style={{
          maxWidth: '100vw',
          maxHeight: '100vh',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
      />
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '16px 20px 20px 20px',
        color: '#fff',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.35), transparent)'
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}>
          {prompt}
        </div>
      </div>
    </div>
  );
}


