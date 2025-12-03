import React, { useEffect, useState } from 'react';
import { Check, Shield, Lock, Zap } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import LoginPromptModal from '@/auth/LoginPromptModal';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PayPalButton from '@/payments/PayPalButton';
import { useSEO } from '@/seo/useSEO';

const plans = [
  { id: 'free', name: 'Free', price: '$0', monthlyLimit: 15, dailyLimit: 3, cta: 'Get started' },
  { id: 'pro100', name: '$10 / month', price: '$10', monthlyLimit: 100, dailyLimit: Infinity, cta: 'Choose $10 plan' },
  { id: 'pro200', name: '$15 / month', price: '$15', monthlyLimit: 200, dailyLimit: Infinity, cta: 'Choose $15 plan' },
];

export default function Pricing() {
  useSEO({
    title: 'Pricing',
    description: 'Choose the plan that fits your creative needs and upgrade anytime.'
  });
  const { user, plan, setPlan } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const link100 = import.meta.env.VITE_STRIPE_LINK_PRO100;
  const link200 = import.meta.env.VITE_STRIPE_LINK_PRO200;

  useEffect(() => {
    if (user && showLogin) setShowLogin(false);
  }, [user, showLogin]);

  const handleSelect = (planId) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    // Free plan applies immediately
    if (planId === 'free') {
      setPlan(planId);
      return;
    }
    // For paid plans, show payment options area (handled below)
  };

  const featureLines = (p) => [
    `${p.dailyLimit === Infinity ? 'Unlimited' : p.dailyLimit} images/day`,
    `${p.monthlyLimit} images/month`,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900">Choose your plan</h1>
          <p className="text-slate-600 mt-2">Start free. Upgrade when you need more.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap mt-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-white">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-sm">Secure payments</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-white">
              <Lock className="w-4 h-4 text-sky-600" />
              <span className="text-sm">Private by default</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 bg-white">
              <Zap className="w-4 h-4 text-violet-600" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isActive = plan === p.id;
            return (
              <div key={p.id} className={`bg-white rounded-2xl border ${isActive ? 'border-violet-300' : 'border-slate-200'} shadow-sm p-6 flex flex-col`}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
                  <div className="text-3xl font-bold mt-2">{p.price}<span className="text-base font-medium text-slate-500">{p.id === 'free' ? '' : '/mo'}</span></div>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 flex-1">
                  {featureLines(p).map((line, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-violet-600" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                {p.id === 'free' ? (
                  <button
                    onClick={() => handleSelect(p.id)}
                    className={`mt-6 w-full px-4 py-2.5 rounded-xl text-sm font-medium ${isActive ? 'bg-violet-600 text-white' : 'border border-slate-200 text-slate-800 hover:bg-slate-50'}`}
                  >
                    {isActive ? 'Current plan' : p.cta}
                  </button>
                ) : (
                  <div className="mt-6 space-y-3">
                    {(() => {
                      const planStripeLink = p.id === 'pro100' ? link100 : link200;
                      if (planStripeLink) {
                        return <StripePaymentLinkButton planId={p.id} disabled={!user} />;
                      }
                      if (paypalClientId) {
                        return (
                          <PayPalButton
                            amount={p.id === 'pro100' ? 10 : 15}
                            disabled={!user}
                            onSuccess={() => {
                              setPlan(p.id);
                              navigate(createPageUrl('Home'));
                            }}
                          />
                        );
                      }
                      return (
                        <div className="text-xs text-slate-500 border border-slate-200 rounded-md px-3 py-2">
                          No payment methods configured for this plan.
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <LoginPromptModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}

function StripePaymentLinkButton({ planId, disabled }) {
  const link100 = import.meta.env.VITE_STRIPE_LINK_PRO100;
  const link200 = import.meta.env.VITE_STRIPE_LINK_PRO200;
  const href = planId === 'pro100' ? link100 : link200;
  const label = 'Get Started';
  if (!href) return null;
  return (
    <a
      href={disabled ? undefined : href}
      target="_blank"
      rel="noreferrer"
      className={`block w-full text-center px-4 py-2.5 rounded-xl text-sm font-medium ${disabled ? 'border border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
    >
      {label}
    </a>
  );
}


