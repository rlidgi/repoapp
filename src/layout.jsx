import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, Images, Plus, Facebook } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-28">
            {/* Logo */}
            <Link
              to={createPageUrl('Home')}
              className="flex items-center gap-3 group"
            >
              <img
                src="/logo.png"
                alt="Piclumo"
                className="h-24 md:h-28 object-contain"
                loading="lazy"
              />
            </Link>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1 overflow-x-auto sm:overflow-visible">
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
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-lg focus:shadow focus:outline-none">Skip to content</a>
      <main id="main" className="flex-1">
        {children}
      </main>

		{/* Footer */}
		<footer className="border-t border-slate-200 bg-white">
			<div className="max-w-7xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-3">
				<div>
					<div className="flex items-center gap-3 mb-3">
						<img
							src="/logo.png"
							alt="Piclumo"
							className="h-8 md:h-10 object-contain"
							loading="lazy"
						/>
						<span className="text-base font-semibold text-slate-900">Piclumo</span>
					</div>
					<p className="text-sm text-slate-600">Create stunning AI images from prompts or full articles.</p>
				</div>
				<nav className="text-sm">
					<div className="font-semibold text-slate-900 mb-3">Explore</div>
					<ul className="space-y-2 text-slate-600">
						<li><Link to={createPageUrl('Home')} className="hover:text-slate-900">Create</Link></li>
						<li><Link to={createPageUrl('Gallery')} className="hover:text-slate-900">Gallery</Link></li>
						<li><Link to={createPageUrl('Pricing')} className="hover:text-slate-900">Pricing</Link></li>
						<li><Link to={createPageUrl('Privacy')} className="hover:text-slate-900">Privacy</Link></li>
						<li><Link to={createPageUrl('Terms')} className="hover:text-slate-900">Terms</Link></li>
					</ul>
				</nav>
				<div className="text-sm text-slate-600">
					<div className="font-semibold text-slate-900 mb-3">Get started</div>
					<p>It’s free to try. No credit card required.</p>
				</div>
			</div>
			<div className="border-t border-slate-100">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-500">
					<span>© {new Date().getFullYear()} Piclumo. All rights reserved.</span>
					<div className="flex items-center gap-4">
						<a
							href="https://www.facebook.com/profile.php?id=61584415657720"
							target="_blank"
							rel="noreferrer"
							aria-label="Piclumo on Facebook"
							className="hover:text-slate-700"
						>
							<Facebook className="w-4 h-4" />
						</a>
					</div>
				</div>
			</div>
		</footer>

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
