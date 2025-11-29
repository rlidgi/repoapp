import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { createPageUrl } from '@/utils';
import GeneratedImageCard from './GeneratedImageCard';

export default function RecentImages({ images, isLoading }) {
  if (isLoading) {
    return (
      <div className="mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-slate-900">Recent Creations</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="mt-16">
        <div className="text-center py-16 px-8 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-3xl">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">No images yet</h3>
          <p className="text-slate-500 text-sm">Your generated images will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-slate-900">Recent Creations</h2>
        <Link 
          to={createPageUrl('Gallery')}
          className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.slice(0, 4).map((image, index) => (
          <GeneratedImageCard key={image.id} image={image} delay={index * 0.1} />
        ))}
      </div>
    </div>
  );
}
