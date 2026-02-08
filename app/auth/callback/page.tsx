'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait a moment for the URL to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if we have a session (this will handle the OAuth tokens in the URL)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        if (!session) {
          console.error('No session found after OAuth callback');
          setError('Authentication failed. Please try again.');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // Session established successfully
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

        // Redirect based on setup status
        if (profile?.semester_start) {
          router.push('/dashboard');
        } else {
          router.push('/set-password');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    handleCallback();
  }, [router]);

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
