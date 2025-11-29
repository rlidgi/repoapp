import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2 } from 'lucide-react';

export default function PromptInput({ value, onChange, onGenerate, isLoading, mode }) {
  const placeholders = {
    prompt: "Describe the image you want to create...\n\nBe detailed: style, colors, mood, composition",
    article: "Paste your article text here...\n\nWe'll analyze it and generate relevant images for your content"
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholders[mode]}
          className="min-h-[180px] resize-none bg-white border-slate-200 rounded-2xl p-5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all duration-300 text-base leading-relaxed"
        />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      <Button
        onClick={onGenerate}
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
