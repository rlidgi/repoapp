import React, { useState } from 'react';
import { Download, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function GeneratedImageCard({ image, delay = 0 }) {
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(image.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.open(image.image_url, '_blank');
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(image.image_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={image.image_url}
          alt={image.prompt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-white/90 text-sm line-clamp-2 mb-4 font-light">
            {image.prompt}
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              size="sm"
              className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0 rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleCopyUrl}
              size="sm"
              variant="ghost"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl px-3"
            >
              {copied ? <Check className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
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
    </motion.div>
  );
}
