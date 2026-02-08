'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');

      // Check if user has completed profile setup
      const { data: profile } = await supabase
        .from('profiles')
        .select('semester_start')
        .eq('id', user.id)
        .single();

      // If profile is fully set up, redirect to dashboard
      // (Users can set password from profile page if needed)
      if (profile?.semester_start) {
        router.push('/dashboard');
        return;
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true, message: 'Password meets requirements' };
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match!", type: 'error' });
      setLoading(false);
      return;
    }

    // Validate password strength
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setMessage({ text: passwordCheck.message, type: 'error' });
      setLoading(false);
      return;
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      setMessage({ text: "You must accept the Terms & Conditions and Privacy Policy to continue", type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage({ text: 'No user found. Please log in again.', type: 'error' });
        setLoading(false);
        return;
      }

      // Update the Supabase Auth password so user can log in with email/password
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateAuthError) {
        throw updateAuthError;
      }

      // Store terms acceptance timestamp in profile
      await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', user.id);

      setMessage({ text: 'Password set successfully! Redirecting...', type: 'success' });
      
      // Check if user has completed setup
      const { data: profile } = await supabase
        .from('profiles')
        .select('semester_start')
        .eq('id', user.id)
        .single();

      setTimeout(() => {
        if (profile?.semester_start) {
          router.push('/dashboard');
        } else {
          router.push('/setup');
        }
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <Loader2 className="animate-spin mx-auto mb-2 text-black" size={32} />
          <p className="font-bold text-black">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-400 border-[3px] border-black rotate-12 opacity-20"></div>
        <div className="absolute bottom-32 right-20 w-24 h-24 bg-purple-400 border-[3px] border-black -rotate-12 opacity-20"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-yellow-400 border-[3px] border-black rotate-45 opacity-15"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Main Card */}
        <div className="border-[3px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block border-[3px] border-black bg-green-500 px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 dark:border-white">
              <div className="flex items-center gap-2">
                <Shield size={28} className="text-white" />
                <h1 className="text-2xl md:text-3xl font-black text-white">Set Password</h1>
              </div>
            </div>
            <p className="text-lg font-bold text-black dark:text-white mt-4">
              One last step! 
            </p>
            <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-1">
              Create a password for your account
            </p>
            {userEmail && (
              <div className="mt-3 border-[2px] border-black bg-blue-100 dark:bg-blue-900/30 dark:border-white px-3 py-2">
                <p className="text-sm font-bold text-black dark:text-blue-300">
                  📧 {userEmail}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSetPassword} className="space-y-5">
            {/* Password Field */}
            <div>
              <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                Password
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
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className={clsx(
                    "w-full pl-12 pr-4 py-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]",
                    "transition-all duration-150",
                    "placeholder:text-gray-400",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <p className="text-xs font-semibold text-gray-500 mt-2">
                Min 8 chars, 1 uppercase, 1 lowercase, 1 number
              </p>
            </div>

            {/* Terms Acceptance Checkbox */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div 
                    className={clsx(
                      "w-6 h-6 border-[3px] border-black transition-all duration-150",
                      "dark:border-white",
                      acceptedTerms ? "bg-green-500" : "bg-white dark:bg-slate-700"
                    )}
                  >
                    {acceptedTerms && (
                      <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-black dark:text-white group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors leading-relaxed">
                  I have read and agree to the{' '}
                  <Link 
                    href="/legal" 
                    target="_blank"
                    className="text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms & Conditions
                  </Link>
                  {' '}and{' '}
                  <Link 
                    href="/legal" 
                    target="_blank"
                    className="text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>

            {/* Password match indicator */}
            {confirmPassword && (
              <div className={clsx(
                "border-[2px] border-black p-2 text-sm font-bold",
                password === confirmPassword 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords don't match"}
              </div>
            )}

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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || !acceptedTerms}
              className={clsx(
                "w-full py-4 text-lg font-black text-white",
                "border-[3px] border-black bg-green-500",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "transition-all duration-150",
                "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                "dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto" size={24} />
              ) : (
                ' Set Password & Continue'
              )}
            </button>
          </form>

          {/* Info box */}
          <div className="mt-6 border-[3px] border-black bg-blue-100 p-4 dark:bg-blue-900/30 dark:border-white">
            <p className="text-xs font-bold text-black dark:text-blue-300">
              ℹ️ This password is required for all accounts, including Google sign-ins. It helps keep your attendance data secure.
            </p>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="mt-6 text-center">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
             Your data is secure with us
          </p>
        </div>
      </div>
    </div>
  );
}
