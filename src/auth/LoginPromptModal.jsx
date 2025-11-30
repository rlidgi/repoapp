import React from 'react';
import GoogleLoginButton from './GoogleLoginButton';
import { X } from 'lucide-react';
import EmailAuthForm from './EmailAuthForm';

export default function LoginPromptModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Sign in required</h2>
            <p className="text-slate-600 text-sm mt-1">
              To generate images, sign in with Google or your email.
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 rounded-lg p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-stretch gap-4">
          <GoogleLoginButton />

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">or</span>
            </div>
          </div>

          <EmailAuthForm onSuccess={onClose} />

          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


