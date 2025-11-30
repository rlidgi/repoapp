import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export default function EmailAuthForm({ onSuccess }) {
  const { signInWithEmail, registerWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(name, email, password);
        toast.success('Verification email sent. Please check your inbox.');
      }
      onSuccess?.();
    } catch (err) {
      const message = err?.message || 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!email) {
      setError('Enter your email above, then click Forgot password.');
      return;
    }
    try {
      await resetPassword(email);
      toast.success('Password reset email sent.');
      setInfo('Password reset email sent.');
    } catch (err) {
      const message = err?.message || 'Failed to send reset email';
      setError(message);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <button
          className={`px-3 py-1.5 text-sm rounded-lg ${mode === 'signin' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
        <button
          className={`px-3 py-1.5 text-sm rounded-lg ${mode === 'signup' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          onClick={() => setMode('signup')}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div>
            <label className="block text-sm text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder="Jane Doe"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            placeholder="••••••••"
            required
            minLength={6}
          />
          {mode === 'signin' && (
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>
        {info && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            {info}
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? 'Please wait...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </button>
      </form>
    </div>
  );
}


