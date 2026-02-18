'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('semester_start')
        .eq('id', user.id)
        .single();

      // PGRST116 = "no rows found" (new user, needs setup)
      // Any other error means a real problem (RLS/network) — send to dashboard
      // rather than incorrectly bouncing to /setup
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile query error:', profileError);
        router.push('/dashboard');
        return;
      }

      if (profile?.semester_start) {
        router.push('/dashboard');
      } else {
        router.push('/setup');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-slate-500">Redirecting...</p>
      </div>
    </div>
  );
}
