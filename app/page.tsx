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
