import React from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ModeToggle({ mode, setMode }) {
  return (
    <div className="flex items-center justify-center">
      <div className="relative bg-slate-100 rounded-2xl p-1.5 flex gap-1">
        <button
          onClick={() => setMode('prompt')}
          className={cn(
            "relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300",
            mode === 'prompt' 
              ? "text-white" 
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>Prompt</span>
        </button>
        <button
          onClick={() => setMode('article')}
          className={cn(
            "relative z-10 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300",
            mode === 'article' 
              ? "text-white" 
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Article mode</span>
        </button>

        {/* Sliding background */}
        <div
          className={cn(
            "absolute top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl transition-all duration-300 ease-out shadow-lg shadow-violet-500/25",
            mode === 'article' ? "left-[calc(50%+2px)]" : "left-1.5"
          )}
        />
      </div>
    </div>
  );
}
