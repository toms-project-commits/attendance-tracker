'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Timeout guard: if no auth event fires within 15s, redirect to login
    const timeoutId = setTimeout(() => {
      if (isMounted && !error) {
        setError('Authentication timed out. Please try again.');
        setTimeout(() => router.push('/login'), 2000);
      }
    }, 15000);

    // Listen for the Supabase auth state change instead of an arbitrary 100ms delay.
    // The PKCE flow fires SIGNED_IN once the code exchange completes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        clearTimeout(timeoutId);
        try {
          const user = session.user;

          // Check if user has completed profile setup
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('semester_start')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile error:', profileError);
          }

          if (!isMounted) return;

          // Redirect based on setup status
          if (profile?.semester_start) {
            router.push('/dashboard');
          } else {
            router.push('/set-password');
          }
        } catch (err) {
          console.error('Callback error:', err);
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            setTimeout(() => router.push('/login'), 2000);
          }
        }
      }
    });

    // Also check if user is already authenticated (e.g., implicit flow already resolved)
    const checkExisting = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (user) {
        clearTimeout(timeoutId);
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('semester_start')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile error:', profileError);
          }

          if (!isMounted) return;

          if (profile?.semester_start) {
            router.push('/dashboard');
          } else {
            router.push('/set-password');
          }
        } catch (err) {
          console.error('Callback error:', err);
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            setTimeout(() => router.push('/login'), 2000);
          }
        }
      }
    };
    checkExisting();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router, error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="border-[3px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-center max-w-md">
        {error ? (
          <>
            <div className="inline-block border-[3px] border-black bg-red-500 p-4 mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-2xl font-black text-black dark:text-white mb-4">
              Authentication Error
            </h2>
            <p className="text-base font-bold text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <p className="text-sm font-semibold text-gray-500">
              Redirecting to login...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
            <h2 className="text-2xl font-black text-black dark:text-white mb-2">
              Completing sign-in...
            </h2>
            <p className="text-base font-bold text-gray-600 dark:text-gray-400">
              Please wait while we set up your session
            </p>
          </>
        )}
      </div>
    </div>
  );
}
