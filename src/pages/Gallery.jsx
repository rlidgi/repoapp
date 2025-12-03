import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trash2, ImageIcon, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import GeneratedImageCard from '@/components/generator/GeneratedImageCard';
import { useSEO } from '@/seo/useSEO';

export default function Gallery() {
  useSEO({
    title: 'Gallery',
    description: 'Browse and manage your AI-generated images in your personal gallery.'
  });
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();
  const { user, plan } = useAuth();

  const { data: images, isLoading } = useQuery({
    queryKey: ['allImages'],
    queryFn: () => base44.entities.GeneratedImage.list('-created_date', 100),
    enabled: !!user
  });

  const { data: myImages = [] } = useQuery({
    queryKey: ['myImagesUsage', user?.id],
    queryFn: () => user ? base44.entities.GeneratedImage.listByUser(user.id) : Promise.resolve([]),
    enabled: !!user
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GeneratedImage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allImages'] });
      toast.success('Image deleted');
    }
  });

  const filteredImages = images?.filter(img => {
    if (filter === 'all') return true;
    return img.mode === filter;
  }) || [];

  const withinSameMonth = (d, ref = new Date()) => {
    const dt = new Date(d);
    return dt.getUTCFullYear() === ref.getUTCFullYear() &&
      dt.getUTCMonth() === ref.getUTCMonth();
  };
  const monthlyUsed = myImages.filter(i => withinSameMonth(i.created_date)).length;
  const monthlyLimit = plan === 'pro100' ? 100 : (plan === 'pro200' ? 200 : null);
  const monthlyPct = monthlyLimit ? Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100)) : 0;

  const filterButtons = [
    { id: 'all', label: 'All', icon: ImageIcon },
    { id: 'prompt', label: 'From Prompt', icon: Sparkles },
    { id: 'article', label: 'From Article', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Gallery</h1>
            <p className="text-slate-600">
              {images?.length || 0} images generated
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6 w-full md:w-auto">
            {/* Usage Summary for paid plans */}
            {user && monthlyLimit && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 w-full md:w-72">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Monthly usage</span>
                  <span className="text-sm text-slate-600">{monthlyUsed} / {monthlyLimit}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600"
                    style={{ width: `${monthlyPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
              {filterButtons.map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setFilter(btn.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === btn.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <btn.icon className="w-4 h-4" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Images Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No images found</h3>
            <p className="text-slate-500">
              {filter !== 'all' 
                ? 'Try changing the filter or generate some images'
                : 'Start creating amazing images from the home page'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredImages.map((image, index) => (
              <div key={image.id} className="relative group/card">
                <GeneratedImageCard image={image} delay={index * 0.05} />

                {/* Delete Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-4 right-4 w-8 h-8 rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this image?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The image will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => toast.error('Delete is not available in this demo')}
                        className="bg-red-600 hover:bg-red-700 rounded-xl"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
