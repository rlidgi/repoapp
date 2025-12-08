import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ModeToggle from '@/components/generator/ModeToggle';
import PromptInput from '@/components/generator/PromptInput';
import RecentImages from '@/components/generator/RecentImages';
import GeneratedImageCard from '@/components/generator/GeneratedImageCard';
import { useAuth } from '@/auth/AuthContext';
import { createPageUrl } from '@/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginPromptModal from '@/auth/LoginPromptModal';
import { useSEO } from '@/seo/useSEO';
import { Brush, Shield, ImageIcon } from 'lucide-react';
import TopGallery from '@/components/gallery/TopGallery';
import BottomCarousel from '@/components/gallery/BottomCarousel';






import PiclumoHeroSlider from '@/components/PiclumoHeroSlider';

<div>
  <PiclumoHeroSlider />
</div>


export default function Home() {
  const siteUrl = import.meta.env.VITE_SITE_URL || (window.location && window.location.origin) || '';
  useSEO({
    title: 'Home',
    description: 'Create stunning AI images free. Generate visuals from prompts or full articles.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Piclumo',
      url: siteUrl
    }
  });
  const [mode, setMode] = useState('prompt');
  const [inputText, setInputText] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, plan } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: recentImages, isLoading: loadingRecent, error: recentError } = useQuery({
    queryKey: ['recentImages'],
    queryFn: () => base44.entities.GeneratedImage.list('-created_date', 8),
    enabled: !!user
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'prompt') {
        // Direct prompt generation
        const result = await base44.integrations.Core.GenerateImage({
          prompt: inputText
        });

        // Server already persisted and returned the saved record
        return [result.saved];
      } else {
        // Article mode - analyze and generate multiple images
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this article and create 3 detailed image prompts that would be perfect illustrations for it. Each prompt should be photorealistic and suitable for a professional publication.

Article:
${inputText}

Create prompts that capture key themes, scenes, or concepts from the article.`,
          response_json_schema: {
            type: "object",
            properties: {
              prompts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    prompt: { type: "string" },
                    relevance: { type: "string" }
                  }
                }
              }
            }
          }
        });

        const images = [];
        for (const item of analysis.prompts.slice(0, 3)) {
          const result = await base44.integrations.Core.GenerateImage({
            prompt: item.prompt,
            mode: 'article',
            article_excerpt: inputText.substring(0, 200) + '...'
          });

          images.push(result.saved);
          // small delay between requests to reduce likelihood of Together 429s
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        return images;
      }
    },
    onSuccess: (images) => {
      setGeneratedImages(images);
      queryClient.invalidateQueries({ queryKey: ['recentImages'] });
      toast.success(mode === 'article' ? 'Images generated from your article!' : 'Image created successfully!');
      // Trigger community gallery refresh
      try {
        window.dispatchEvent(new CustomEvent('gallery:refresh'));
      } catch { }
    },
    onError: (err) => {
      console.error(err);
      const code = err?.message || err?.statusText || '';
      if (code === 'quota_exceeded') {
        toast.error('You have reached your plan limit.', {
          action: {
            label: 'View pricing',
            onClick: () => navigate(createPageUrl('Pricing'))
          }
        });
        return;
      }
      const friendly =
        (typeof code === 'string' && code.trim().length > 0)
          ? code
          : 'Generation failed. Please try again.';
      toast.error(friendly);
    }
  });

  const handleGenerate = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setGeneratedImages([]);
    generateMutation.mutate();
  };

  useEffect(() => {
    if (user && showLoginModal) {
      setShowLoginModal(false);
    }
  }, [user, showLoginModal]);

  // Accept prefill from navigation state (e.g., from Gallery history)
  useEffect(() => {
    const s = location?.state;
    if (s && s.prefill) {
      setInputText(s.prefill);
      if (s.mode === 'article' || s.mode === 'prompt') {
        setMode(s.mode);
      }
    }
  }, [location?.state]);

  return (
    <>
      <PiclumoHeroSlider />   {/* ⭐ ADD THIS HERE */}

      <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-x-hidden">
        {/* Decorative background (clipped to container to avoid horizontal overflow) */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 bg-violet-300/30 blur-3xl rounded-full" />
          <div className="absolute top-40 -left-24 h-72 w-72 bg-fuchsia-300/20 blur-3xl rounded-full" />
        </div>
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 rounded-full mb-6">
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              <span className="text-sm text-violet-700 font-medium">AI-Powered Generation</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Create Stunning Images
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Transform your ideas into beautiful visuals. Perfect for writers, creators, and dreamers.
            </p>
          </motion.div>

          {/* Hero visual removed per request to place logo above AI badge */}

          {/* Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <ModeToggle mode={mode} setMode={setMode} />
          </motion.div>



          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <PromptInput
              value={inputText}
              onChange={setInputText}
              onGenerate={handleGenerate}
              isLoading={generateMutation.isPending}
              mode={mode}
            />
          </motion.div>

          {/* Feature cards (below generate button) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid gap-4 md:grid-cols-3 mb-10"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3">
                <Brush className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Photorealistic results</h3>
              <p className="text-sm text-slate-600">Clean, high-quality images generated from your prompts.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center mb-3">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Article to visuals</h3>
              <p className="text-sm text-slate-600">Paste an article and get multiple perfect illustrations.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Private & secure</h3>
              <p className="text-sm text-slate-600">Your creations stay yours with secure access controls.</p>
            </div>
          </motion.div>
          {/* Mode Description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-12"
            >
              {mode === 'article' && (
                <div className="inline-flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
                  <span className="text-amber-600 text-sm">
                    💡 Perfect for writers — paste your article and get stock-photo-free illustrations
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Community Top Gallery */}
          <TopGallery />

          {/* Generated Images */}
          <AnimatePresence>
            {generatedImages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-16"
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-6">
                  {mode === 'article' ? 'Generated for Your Article' : 'Your Creation'}
                </h2>
                <div className={`grid gap-6 ${generatedImages.length > 1 ? 'grid-cols-1 md:grid-cols-3' : 'max-w-xl mx-auto'}`}>
                  {generatedImages.map((image, index) => (
                    <GeneratedImageCard key={image.id} image={image} delay={index * 0.15} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Images */}
          <RecentImages images={recentImages} isLoading={loadingRecent} error={recentError} />
        </div>
        <LoginPromptModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
        {/* Bottom auto-scrolling carousel */}
        <BottomCarousel />
      </div>
    </>
  );

}
