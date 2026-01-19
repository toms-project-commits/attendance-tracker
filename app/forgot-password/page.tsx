'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password`,
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: "Check your email for the password reset link.", type: 'success' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full">
        {/* Back Button */}
        <Link 
          href="/login" 
          className={clsx(
            "inline-flex items-center gap-2 mb-6 px-4 py-2 border-[3px] border-black bg-white font-bold text-black text-sm",
            "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
            "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
            "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
            "transition-all duration-150",
            "dark:bg-slate-800 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          )}
        >
          <ArrowLeft size={16} /> Back to Login
        </Link>

        {/* Main Card */}
        <div className="border-[3px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
          <div className="text-center mb-8">
            <div className="inline-block border-[3px] border-black bg-orange-500 px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 dark:border-white">
              <h1 className="text-2xl md:text-3xl font-black text-white">🔑 Reset Password</h1>
            </div>
            <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-4">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  className={clsx(
                    "w-full pl-12 pr-4 py-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]",
                    "transition-all duration-150",
                    "placeholder:text-gray-400",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Error/Success Message */}
            {message && (
              <div 
                className={clsx(
                  "border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  message.type === 'error' ? 'bg-red-400' : 'bg-green-400'
                )}
              >
                <p className="text-sm font-bold text-black">
                  {message.type === 'error' ? '❌ ' : '✅ '}{message.text}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "w-full py-4 text-lg font-black text-white",
                "border-[3px] border-black bg-blue-500",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "transition-all duration-150",
                "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto" size={24} />
              ) : (
                '📧 Send Reset Link'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
