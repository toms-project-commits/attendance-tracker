'use client';
import { useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  BookOpen,
  Calendar,
  PieChart,
  CheckCircle,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Zap,
  Image as ImageIcon,
  Loader2,
  Rocket,
  Users,
  UserCircle,
  CalendarDays,
  Hand,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { clsx } from 'clsx';
import useStudentData from '@/lib/hooks/useStudentData';
import { calculateAttendance } from '@/lib/utils/attendanceCalculations';

const calculateAttendancePercentage = (attended: number, total: number): number => {
  return total > 0 ? Math.round((attended / total) * 100) : 0;
};

const Dashboard = memo(function Dashboard() {
  const router = useRouter();
  const { user, profile, subjects, timetable, holidays, logs, loading: dataLoading, refresh } = useStudentData();

  const checkAuth = useCallback(() => {
    if (!dataLoading && !user) {
      router.push('/login');
    }
  }, [dataLoading, router, user]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('refresh')) {
        refresh(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [refresh]);

  const userName = useMemo(() => {
    if (profile?.username) return profile.username;
    return user?.email?.split('@')[0] || 'Student';
  }, [user, profile]);

  const stats = useMemo(() => {
    const result = calculateAttendance(profile, subjects, timetable, holidays, logs);
    return { attended: result.overall.attended, total: result.overall.total };
  }, [profile, subjects, timetable, holidays, logs]);

  const todayClasses = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    const dbDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    return timetable.filter((slot) => slot.day_of_week === dbDay && slot.slot_type === 'SUBJECT').length;
  }, [timetable]);

  const subjectCount = subjects.length;
  const attendancePercent = calculateAttendancePercentage(stats.attended, stats.total);
  const isSafe = stats.total === 0 || attendancePercent >= 75;

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Unexpected error signing out:', error);
    }
    router.push('/login');
  }, [router]);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse dark:border-white">
          <span className="text-xl font-black flex items-center gap-2">
            <Loader2 className="animate-spin" size={24} />
            Loading your dashboard...
          </span>
        </div>
      </div>
    );
  }

  // Determine status color for hero card
  const heroColor = stats.total === 0
    ? 'bg-blue-500'
    : isSafe
      ? 'bg-green-500'
      : 'bg-red-500';

  const statusSub = stats.total === 0
    ? 'Set up subjects & timetable to begin'
    : isSafe
      ? `${attendancePercent}% — Keep it up!`
      : `${attendancePercent}% — Attend more classes!`;

  return (
    <div className="min-h-screen pb-8">

      {/* ── TOP NAV ── */}
      <nav className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <h1 className="text-xl md:text-2xl font-black text-black dark:text-white flex items-center gap-2">
          <Image src="/logo.png" alt="BunkSafe" width={32} height={32} className="rounded-sm" />
          BunkSafe
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className={clsx(
              'flex items-center gap-2 px-3 py-2 border-[3px] border-black bg-white font-black text-sm',
              'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
              'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150',
              'dark:bg-slate-700 dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
            )}
          >
            <UserCircle size={18} className="text-black dark:text-white" />
            <span className="hidden sm:inline text-black dark:text-white">{userName}</span>
          </Link>
          <button
            onClick={handleLogout}
            className={clsx(
              'p-2 border-[3px] border-black bg-red-500 text-white',
              'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
              'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150',
              'dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
            )}
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

        {/* ── HERO: WELCOME + STATUS + QUICK STATS ── */}
        <div className={clsx(
          'border-[3px] border-black p-5 md:p-7',
          'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
          heroColor
        )}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">

            {/* Left: greeting + status */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 flex-wrap mb-1">
                Hey, {userName}! <Hand size={28} className="inline-block" />
              </h2>
              <p className="text-white/90 font-bold text-base mb-4">{statusSub}</p>

              {/* Inline stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/20 border-[2px] border-white p-3 text-center">
                  <div className="text-2xl font-black text-white">{subjectCount}</div>
                  <div className="text-xs font-bold text-white/80 uppercase">Subjects</div>
                </div>
                <div className="bg-white/20 border-[2px] border-white p-3 text-center">
                  <div className="text-2xl font-black text-white">{todayClasses}</div>
                  <div className="text-xs font-bold text-white/80 uppercase">Today</div>
                </div>
                <div className="bg-white/20 border-[2px] border-white p-3 text-center">
                  <div className="text-2xl font-black text-white">
                    {stats.total > 0 ? `${attendancePercent}%` : '--'}
                  </div>
                  <div className="text-xs font-bold text-white/80 uppercase">
                    {stats.total > 0 ? `${stats.attended}/${stats.total}` : 'No data'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: attendance ring (only when there's data) */}
            {stats.total > 0 && (
              <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0 mx-auto lg:mx-0 border-[3px] border-white rounded-full bg-white/10 p-2">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path
                    className="text-white/30"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="currentColor" strokeWidth="3"
                  />
                  <path
                    className={clsx('transition-all duration-1000', attendancePercent >= 75 ? 'text-white' : 'text-yellow-300')}
                    strokeDasharray={`${attendancePercent}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-black text-white/80 uppercase">Overall</span>
                  <span className="text-3xl md:text-4xl font-black text-white">{attendancePercent}%</span>
                  <span className="text-xs font-bold text-white/70">
                    {isSafe ? '✓ Safe' : '⚠ At Risk'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MARK ATTENDANCE CTA ── */}
        <Link href="/mark" className="block group">
          <div className="border-[3px] border-black bg-black text-white p-5 md:p-6 shadow-[6px_6px_0px_0px_rgba(251,191,36,1)] transition-all duration-200 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_rgba(251,191,36,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:bg-slate-700 dark:border-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-5">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-400 border-[3px] border-white flex items-center justify-center group-hover:bg-yellow-300 transition-colors shrink-0">
                  <CheckCircle size={26} className="text-black" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-0.5">Mark Today&apos;s Attendance →</h3>
                  <p className="text-sm font-semibold text-white/80">Tap to log your classes</p>
                </div>
              </div>
              <ChevronRight size={28} className="hidden md:block" />
            </div>
          </div>
        </Link>

        {/* ── ONBOARDING HINT (only when brand new) ── */}
        {stats.total === 0 && subjectCount === 0 && (
          <div className="border-[3px] border-black bg-yellow-400 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-500 border-[3px] border-black flex items-center justify-center shrink-0">
                <Rocket size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-black mb-1">Get Started</h3>
                <p className="text-black text-sm font-semibold mb-3">
                  Add your subjects and set up your timetable to begin tracking attendance.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/subjects"
                    className={clsx(
                      'inline-flex items-center gap-2 px-4 py-2 border-[3px] border-black bg-blue-500 text-white font-black text-sm',
                      'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                      'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                      'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                    )}
                  >
                    <BookOpen size={15} /> Add Subjects
                  </Link>
                  <Link
                    href="/timetable"
                    className={clsx(
                      'inline-flex items-center gap-2 px-4 py-2 border-[3px] border-black bg-white text-black font-black text-sm',
                      'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                      'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                      'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                    )}
                  >
                    <CalendarDays size={15} /> Setup Timetable
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FEATURE GRID ── */}
        <div>
          <h2 className="text-xl font-black text-black dark:text-white mb-4 flex items-center gap-2">
            <Zap size={20} /> Quick Access
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Subjects */}
            <Link href="/subjects" className="block">
              <div className={clsx(
                'border-[3px] border-black bg-blue-100 dark:bg-blue-900/30 p-5',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                'transition-all duration-200 h-full'
              )}>
                <div className="w-12 h-12 bg-blue-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-4">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-1">Subjects</h3>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">
                  {subjectCount > 0 ? `${subjectCount} subjects tracked` : 'Add your classes'}
                </p>
              </div>
            </Link>

            {/* Timetable */}
            <Link href="/timetable" className="block">
              <div className={clsx(
                'border-[3px] border-black bg-purple-100 dark:bg-purple-900/30 p-5',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                'transition-all duration-200 h-full'
              )}>
                <div className="w-12 h-12 bg-purple-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-4">
                  <CalendarDays size={24} />
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-1">Timetable</h3>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">Weekly schedule &amp; slots</p>
              </div>
            </Link>

            {/* Calendar */}
            <Link href="/dashboard/calendar" className="block">
              <div className={clsx(
                'border-[3px] border-black bg-green-100 dark:bg-green-900/30 p-5',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                'transition-all duration-200 h-full'
              )}>
                <div className="w-12 h-12 bg-green-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-4">
                  <Calendar size={24} />
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-1">Calendar</h3>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">Monthly attendance view</p>
              </div>
            </Link>

            {/* Analytics */}
            <Link href="/analytics" className="block">
              <div className={clsx(
                'border-[3px] border-black bg-orange-100 dark:bg-orange-900/30 p-5',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                'transition-all duration-200 h-full'
              )}>
                <div className="w-12 h-12 bg-orange-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-4">
                  <PieChart size={24} />
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-1">Analytics</h3>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">
                  {stats.total > 0 && !isSafe
                    ? <span className="text-red-600 dark:text-red-400 flex items-center gap-1"><AlertTriangle size={12} /> Needs attention</span>
                    : 'Stats & insights'
                  }
                </p>
              </div>
            </Link>

            {/* Friends */}
            <Link href="/friends" className="block">
              <div className={clsx(
                'border-[3px] border-black bg-cyan-100 dark:bg-cyan-900/30 p-5',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                'transition-all duration-200 h-full'
              )}>
                <div className="w-12 h-12 bg-cyan-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-4">
                  <Users size={24} />
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-1">Friends</h3>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">Compare with classmates</p>
              </div>
            </Link>

            {/* View Proofs */}
            <Link href="/proofs" className="block">
              <div className={clsx(
                'border-[3px] border-black bg-pink-100 dark:bg-pink-900/30 p-5',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                'transition-all duration-200 h-full'
              )}>
                <div className="w-12 h-12 bg-pink-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-4">
                  <ImageIcon size={24} />
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-1">Proofs</h3>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">Attendance proof photos</p>
              </div>
            </Link>

            {/* Profile */}
            <Link href="/profile" className="block">
              <div className={clsx(
                'border-[3px] border-black bg-indigo-100 dark:bg-indigo-900/30 p-5',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                'transition-all duration-200 h-full'
              )}>
                <div className="w-12 h-12 bg-indigo-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-4">
                  <UserCircle size={24} />
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-1">Profile</h3>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">Account &amp; settings</p>
              </div>
            </Link>

            {/* New Semester */}
            <Link href="/setup/reset" className="block">
              <div className={clsx(
                'border-[3px] border-black bg-yellow-100 dark:bg-yellow-900/30 p-5',
                'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                'transition-all duration-200 h-full'
              )}>
                <div className="w-12 h-12 bg-yellow-500 border-[3px] border-black dark:border-white flex items-center justify-center text-black mb-4">
                  <GraduationCap size={24} />
                </div>
                <h3 className="text-lg font-black text-black dark:text-white mb-1">New Semester</h3>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 leading-snug">Archive &amp; start fresh</p>
              </div>
            </Link>

          </div>
        </div>

        {/* ── TRENDING STAT (only when attendance data exists and at risk) ── */}
        {stats.total > 0 && !isSafe && (
          <div className="border-[3px] border-black bg-red-100 dark:bg-red-900/30 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 border-[3px] border-black dark:border-white flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-black text-red-700 dark:text-red-400">Attendance below 75%</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-500">
                  {stats.attended}/{stats.total} classes attended. Check Analytics for details.
                </p>
              </div>
              <Link
                href="/analytics"
                className={clsx(
                  'shrink-0 flex items-center gap-1 px-4 py-2 border-[3px] border-black bg-red-500 text-white font-black text-sm',
                  'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                  'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                  'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150',
                  'dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
                )}
              >
                <TrendingUp size={15} /> View
              </Link>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="text-center pt-4">
          <div className="flex items-center justify-center gap-4 flex-wrap mb-2">
            <Link href="/about" className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors underline underline-offset-2">
              About
            </Link>
            <span className="text-gray-400 dark:text-gray-600">•</span>
            <Link href="/legal" className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors underline underline-offset-2">
              Terms &amp; Privacy
            </Link>
          </div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-500">A project by Thomas George</p>
        </div>

      </main>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
export default Dashboard;
