'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function UpdatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
    };

    checkSession();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match!", type: 'error' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters long!", type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setMessage({ text: error.message, type: 'error' });
      } else {
        setMessage({ text: "Password updated successfully! Redirecting to login...", type: 'success' });
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
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
            <div className="inline-block border-[3px] border-black bg-green-500 px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 dark:border-white">
              <h1 className="text-2xl md:text-3xl font-black text-white">🔐 Update Password</h1>
            </div>
            <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-4">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className={clsx(
                    "w-full pl-12 pr-12 py-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]",
                    "transition-all duration-150",
                    "placeholder:text-gray-400",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className={clsx(
                    "w-full pl-12 pr-12 py-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]",
                    "transition-all duration-150",
                    "placeholder:text-gray-400",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
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
                '🔒 Update Password'
              )}
            </button>
          </form>

          {/* Password Requirements */}
          <div className="mt-6 border-[3px] border-black bg-blue-100 p-4 dark:border-white dark:bg-blue-900/30">
            <h3 className="text-sm font-black text-black dark:text-white flex items-center gap-2 mb-2">
              <ShieldCheck size={18} /> Password Requirements
            </h3>
            <ul className="text-xs font-bold text-gray-700 dark:text-gray-300 space-y-1">
              <li>• At least 6 characters long</li>
              <li>• Both passwords must match</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
 