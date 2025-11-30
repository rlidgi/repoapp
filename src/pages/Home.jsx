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
import { useNavigate } from 'react-router-dom';
import LoginPromptModal from '@/auth/LoginPromptModal';

export default function Home() {
  const [mode, setMode] = useState('prompt');
  const [inputText, setInputText] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, plan } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: recentImages, isLoading: loadingRecent } = useQuery({
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
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
            Create Stunning Images Free
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Transform your ideas into beautiful visuals. Perfect for writers, creators, and dreamers.
          </p>
        </motion.div>

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
        <RecentImages images={recentImages} isLoading={loadingRecent} />
      </div>
      <LoginPromptModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
