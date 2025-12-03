import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, Images, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import LoginPromptModal from '@/auth/LoginPromptModal';

export default function Layout({ children }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const navItems = [
    { name: 'Home', icon: Plus, label: 'Create' },
    { name: 'Gallery', icon: Images, label: 'Gallery' },
    { name: 'Pricing', icon: null, label: 'Pricing' },
  ];

  const isActive = (pageName) => {
    const pageUrl = createPageUrl(pageName);
    return location.pathname === pageUrl;
  };

  useEffect(() => {
    if (user && showLoginModal) {
      setShowLoginModal(false);
    }
  }, [user, showLoginModal]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to={createPageUrl('Home')}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all duration-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">
				Piclumo
              </span>
            </Link>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1">
                {navItems.map(item => (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive(item.name)
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    {item.icon ? <item.icon className="w-4 h-4" /> : null}
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-2">
                      {user.picture && (
                        <img
                          src={user.picture}
                          alt={user.name || 'User'}
                          className="w-8 h-8 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span className="text-sm text-slate-700 max-w-[12rem] truncate">
                        {user.name || user.email}
                      </span>
                    </div>
                    <button
                      onClick={signOut}
                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>


      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'rounded-xl',
        }}
      />
      <LoginPromptModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
