'use client';

import { ArrowLeft, Zap, Users, Code } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import Link from 'next/link';

export default function AboutPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication status
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  const handleGoBack = () => {
    // If user is authenticated, go to dashboard; otherwise go to login
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--background)' }}>
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-32 h-32 bg-blue-400 border-[3px] border-black -rotate-12 opacity-15 dark:border-white"></div>
        <div className="absolute bottom-32 left-20 w-24 h-24 bg-green-400 border-[3px] border-black rotate-12 opacity-15 dark:border-white"></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-purple-400 border-[3px] border-black -rotate-45 opacity-10 dark:border-white"></div>
      </div>

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white p-4 sticky top-0 z-50 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleGoBack}
              className={clsx(
                "p-3 border-[3px] border-black bg-white",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                "transition-all duration-150",
                "dark:bg-slate-700 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              <ArrowLeft size={20} className="text-black dark:text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-black text-black dark:text-white">
                About BunkSafe
              </h1>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                The mission and the developer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto relative z-10">
        
        {/* MISSION STATEMENT - Hero */}
        <div className="border-[3px] border-black bg-blue-500 text-white p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
          <h2 className="text-2xl md:text-3xl font-black mb-4">
            The Mission: Free Tools for Every Student.
          </h2>
          <p className="text-base md:text-lg font-semibold leading-relaxed opacity-95">
            BunkSafe exists because the tools you need to navigate university should not be hidden behind paywalls or subscriptions.
          </p>
        </div>

        {/* THE STORY */}
        <div className="border-[3px] border-black bg-white p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-green-500 border-[3px] border-black dark:border-white flex items-center justify-center shrink-0">
              <Code size={24} className="text-black" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-black dark:text-white">The Story</h3>
            </div>
          </div>
          <div className="space-y-4 text-base md:text-lg font-semibold text-black dark:text-white leading-relaxed">
            <p>
              I am Thomas George. I built BunkSafe because I was tired of the attendance transparency gap. 
              In many colleges across India, we still rely on manual paper registers. You often do not know 
              your actual percentage until a debarment list is posted.
            </p>
            <p>
              I wanted to fix that by building a personal source of truth that stays in your pocket.
            </p>
          </div>
        </div>

        {/* THE FREE FOREVER PLEDGE */}
        <div className="border-[3px] border-black bg-green-400 p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-black dark:bg-white border-[3px] border-black dark:border-white flex items-center justify-center shrink-0">
              <Zap size={24} className="text-white dark:text-black" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-black">The Free Forever Pledge</h3>
            </div>
          </div>
          <div className="space-y-4 text-base md:text-lg font-semibold text-black leading-relaxed">
            <p>
              BunkSafe is, and will always be, free to use. I believe the tools we need to navigate university 
              should not be hidden behind paywalls or subscriptions.
            </p>
            <p>
              Every feature available now and every feature I build in the future is for everyone, regardless 
              of whether you choose to support the project.
            </p>
          </div>
        </div>

        {/* THE ROADMAP */}
        <div className="border-[3px] border-black bg-white p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-500 border-[3px] border-black dark:border-white flex items-center justify-center shrink-0">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-black dark:text-white">The Roadmap</h3>
            </div>
          </div>
          <p className="text-base md:text-lg font-semibold text-black dark:text-white leading-relaxed mb-5">
            This is just the start. I am currently working on:
          </p>
          <div className="space-y-4">
            {/* Roadmap Item 1 */}
            <div className="border-[3px] border-black bg-blue-100 dark:bg-blue-900/30 p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
              <h4 className="text-lg font-black text-black dark:text-white mb-2">Classmate Companion</h4>
              <p className="text-base font-semibold text-black dark:text-white">
                A lecture-specific note-taking tool that links directly to your daily timetable.
              </p>
            </div>

            {/* Roadmap Item 2 */}
            <div className="border-[3px] border-black bg-purple-100 dark:bg-purple-900/30 p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
              <h4 className="text-lg font-black text-black dark:text-white mb-2">Shared Tracking</h4>
              <p className="text-base font-semibold text-black dark:text-white">
                A system to share and compare attendance stats with friends via usernames with full privacy controls.
              </p>
            </div>
          </div>
        </div>

        {/* WHY SUPPORT */}
        <div className="border-[3px] border-black bg-yellow-400 p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <h3 className="text-xl md:text-2xl font-black text-black mb-4">Why Support?</h3>
          <div className="space-y-4 text-base md:text-lg font-semibold text-black leading-relaxed">
            <p>
              I run this as a solo developer. Your contributions do not unlock pro features. They simply keep 
              the servers running, cover the domain costs, and buy me the time to keep coding.
            </p>
          </div>
        </div>

        {/* SUPPORT PLACEHOLDER */}
        <div className="border-[3px] border-black border-dashed bg-white p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <h3 className="text-xl md:text-2xl font-black text-black dark:text-white mb-4 text-center">
            Support Options
          </h3>
          <p className="text-base font-semibold text-gray-600 dark:text-gray-400 text-center leading-relaxed mb-6">
            If you find BunkSafe helpful and want to support its development, contribution options will be added here in future updates.
          </p>
          <div className="border-[3px] border-black bg-gray-100 dark:bg-slate-700 p-8 text-center dark:border-white">
            <p className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Coming Soon
            </p>
          </div>
        </div>

        {/* LEGAL LINK */}
        <div className="border-[3px] border-black bg-white p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <h3 className="text-xl md:text-2xl font-black text-black dark:text-white mb-4 text-center">
            Legal Information
          </h3>
          <p className="text-base font-semibold text-gray-600 dark:text-gray-400 text-center leading-relaxed mb-6">
            View our Terms & Conditions and Privacy Policy to understand how we protect your data and your rights.
          </p>
          <Link 
            href="/legal"
            className={clsx(
              "w-full py-4 font-black text-lg text-black flex items-center justify-center gap-3",
              "border-[3px] border-black bg-green-400",
              "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
              "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
              "active:translate-x-[6px] active:translate-y-[6px] active:shadow-none",
              "transition-all duration-150",
              "dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
              "dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"
            )}
          >
            View Terms & Privacy Policy
          </Link>
        </div>

        {/* BACK BUTTON */}
        <div className="pt-4">
          <button 
            onClick={handleGoBack}
            className={clsx(
              "w-full py-4 font-black text-lg text-white flex items-center justify-center gap-3",
              "border-[3px] border-black bg-blue-500",
              "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
              "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
              "active:translate-x-[6px] active:translate-y-[6px] active:shadow-none",
              "transition-all duration-150",
              "dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
              "dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"
            )}
          >
            <ArrowLeft size={20} />
            {isAuthenticated === null ? 'Go Back' : isAuthenticated ? 'Back to Dashboard' : 'Back to Login'}
          </button>
        </div>

        {/* Attribution */}
        <div className="text-center pt-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-500">
            A project by Thomas George
          </p>
        </div>
      </main>
    </div>
  );
}
