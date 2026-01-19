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
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  eachDayOfInterval,
  isSunday,
  parseISO,
  isBefore,
  startOfToday,
  format,
  startOfMonth,
  getDay as getDayOfWeek,
  addDays
} from 'date-fns';
import useStudentData from '@/lib/hooks/useStudentData';

interface QuickStatProps {
  label: string;
  value: string | number;
  sublabel: string;
  bgColor: string;
  textColor?: string;
  icon?: React.ReactNode;
}

const calculateAttendancePercentage = (attended: number, total: number): number => {
  return total > 0 ? Math.round((attended / total) * 100) : 0;
};

const QuickStat = memo<QuickStatProps>(({ label, value, sublabel, bgColor, textColor = 'text-black', icon }) => (
  <div 
    className={clsx(
      "border-[3px] border-black p-5 transition-all duration-200",
      "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
      "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
      "dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
      bgColor
    )}
  >
    <div className="flex items-start justify-between mb-2">
      <span className={clsx("text-xs font-black uppercase tracking-wider", textColor)}>{label}</span>
      {icon && <span className={clsx("opacity-70", textColor)}>{icon}</span>}
    </div>
    <div className={clsx("text-4xl font-black", textColor)}>{value}</div>
    <div className={clsx("text-sm mt-1 font-semibold opacity-80", textColor)}>{sublabel}</div>
  </div>
));

QuickStat.displayName = 'QuickStat';

// Neo-Brutalism Button Component
const BrutalButton = memo(({ 
  children, 
  onClick, 
  className = '', 
  variant = 'default',
  href
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  href?: string;
}) => {
  const baseClasses = clsx(
    "inline-flex items-center justify-center px-6 py-3 font-bold text-base",
    "border-[3px] border-black",
    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    "transition-all duration-150",
    "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
    "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
    "dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
    "dark:active:shadow-none",
    {
      'bg-white text-black dark:bg-slate-800 dark:text-white': variant === 'default',
      'bg-blue-500 text-white hover:bg-blue-600': variant === 'primary',
      'bg-red-500 text-white hover:bg-red-600': variant === 'danger',
      'bg-green-500 text-white hover:bg-green-600': variant === 'success',
    },
    className
  );

  if (href) {
    return <Link href={href} className={baseClasses}>{children}</Link>;
  }

  return <button onClick={onClick} className={baseClasses}>{children}</button>;
});

BrutalButton.displayName = 'BrutalButton';

// Neo-Brutalism Card Component
const BrutalCard = memo(({ 
  children, 
  className = '',
  hoverable = true,
  as = 'div'
}: { 
  children: React.ReactNode; 
  className?: string;
  hoverable?: boolean;
  as?: 'div' | 'article' | 'section';
}) => {
  const Component = as;
  return (
    <Component 
      className={clsx(
        "border-[3px] border-black bg-white p-6",
        "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        "dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
        hoverable && [
          "transition-all duration-200",
          "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
          "dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
        ],
        className
      )}
    >
      {children}
    </Component>
  );
});

BrutalCard.displayName = 'BrutalCard';

const Dashboard = memo(function Dashboard() {
  const router = useRouter();
  const { user, profile, subjects, timetable, holidays, logs, loading: dataLoading } = useStudentData();

  const checkAuth = useCallback(() => {
    if (!dataLoading && !user) {
      router.push('/login');
    }
  }, [dataLoading, router, user]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const userName = useMemo(() => {
    if (profile?.username) {
      return profile.username;
    }
    return user?.email?.split('@')[0] || 'Student';
  }, [user, profile]);

  const stats = useMemo(() => {
    if (!profile?.semester_start) {
      return { attended: 0, total: 0 };
    }

    const today = startOfToday();
    const startDate = parseISO(profile.semester_start);

    if (isBefore(today, startDate)) {
      return { attended: 0, total: 0 };
    }

    const daysInterval = eachDayOfInterval({ start: startDate, end: today });
    let totalClassesSoFar = 0;
    let attendedClassesSoFar = 0;

    daysInterval.forEach((dayObj) => {
      const dateStr = format(dayObj, 'yyyy-MM-dd');

      if (isSunday(dayObj)) return;

      const isHoliday = holidays.some((h) => h.date && h.date.substring(0, 10) === dateStr);
      if (isHoliday) return;

      const dayOfWeekIndex = getDayOfWeek(dayObj);
      if (dayOfWeekIndex === 6) {
        const firstOfMonth = startOfMonth(dayObj);
        let firstSaturday: Date | null = null;

        for (let i = 0; i < 7; i++) {
          const candidateDate = addDays(firstOfMonth, i);
          if (getDayOfWeek(candidateDate) === 6) {
            firstSaturday = candidateDate;
            break;
          }
        }

        if (firstSaturday) {
          const daysDiff = Math.floor((dayObj.getTime() - firstSaturday.getTime()) / (1000 * 60 * 60 * 24));
          const weekNum = Math.floor(daysDiff / 7) + 1;
          if (weekNum >= 1 && weekNum <= 5 && profile.saturday_offs && profile.saturday_offs.includes(weekNum)) {
            return;
          }
        }
      }

      const dbDay = dayOfWeekIndex === 0 ? 7 : dayOfWeekIndex;
      const classesForDay = timetable.filter((slot) =>
        slot.day_of_week === dbDay && slot.slot_type === 'SUBJECT'
      );

      if (classesForDay.length === 0) return;

      const daysLogs = logs.filter((log) => log.date && log.date.substring(0, 10) === dateStr);

      classesForDay.forEach((cls) => {
        const logIndex = daysLogs.findIndex((log) => log.subject_id === cls.subject_id);
        let log = null;
        if (logIndex !== -1) {
          log = daysLogs[logIndex];
          daysLogs.splice(logIndex, 1);
        }

        if (log?.status === 'CANCELLED') return;

        totalClassesSoFar++;

        if (log?.status === 'PRESENT') {
          attendedClassesSoFar++;
        }
      });
    });

    return { attended: attendedClassesSoFar, total: totalClassesSoFar };
  }, [holidays, logs, profile, timetable]);

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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      router.push('/login');
    } catch (error) {
      console.error('Unexpected error signing out:', error);
      router.push('/login');
    }
  }, [router]);

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse dark:border-white">
          <span className="text-xl font-black">⏳ Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* TOP NAVIGATION */}
      <nav className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <h1 className="text-xl md:text-2xl font-black text-black dark:text-white flex items-center gap-2">
          <span className="text-2xl">🎓</span> BunkSafe
        </h1>
        <BrutalButton onClick={handleLogout} variant="danger" className="text-sm md:text-base">
          <LogOut size={16} className="mr-2" /> Sign Out
        </BrutalButton>
      </nav>

      {/* MAIN CONTENT */}
      <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* WELCOME BANNER */}
        <div className="border-[3px] border-black bg-blue-500 text-white p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <div className="flex items-center justify-between gap-6 flex-col lg:flex-row">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-black mb-3">
                Welcome back, {userName}! 👋
              </h2>
              <p className="text-lg md:text-xl font-bold opacity-90">
                Track every class. Own your attendance. No excuses.
              </p>
            </div>

            {/* Attendance Circle - Prominent Display */}
            {stats.total > 0 && (
              <div className="relative w-36 h-36 md:w-44 md:h-44 shrink-0 border-[3px] border-white rounded-full bg-white/10 p-2">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path 
                    className="text-white/30" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                  />
                  <path 
                    className={clsx(
                      "transition-all duration-1000 ease-out",
                      attendancePercent >= 75 ? "text-green-400" : "text-red-400"
                    )} 
                    strokeDasharray={`${attendancePercent}, 100`} 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-black uppercase tracking-wider">Semester</span>
                  <span className="text-4xl font-black">{attendancePercent}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STATUS INDICATOR - Most Prominent */}
        <div 
          className={clsx(
            "border-[3px] border-black p-5 md:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
            isSafe ? "bg-green-400" : "bg-red-500"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-14 h-14 md:w-16 md:h-16 border-[3px] border-black flex items-center justify-center",
              isSafe ? "bg-green-600" : "bg-red-700"
            )}>
              {isSafe ? (
                <CheckCircle size={32} className="text-white" />
              ) : (
                <AlertTriangle size={32} className="text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={clsx(
                "text-2xl md:text-3xl font-black",
                isSafe ? "text-black" : "text-white"
              )}>
                {stats.total === 0 ? "🚀 READY TO START" : isSafe ? "✅ YOU'RE SAFE" : "⚠️ CRITICAL"}
              </h3>
              <p className={clsx(
                "text-base md:text-lg font-bold",
                isSafe ? "text-black/80" : "text-white/90"
              )}>
                {stats.total === 0 
                  ? "Set up your subjects and timetable to begin tracking" 
                  : isSafe 
                    ? `Attendance at ${attendancePercent}% - Keep it up!`
                    : `Attendance at ${attendancePercent}% - You need to attend more classes!`
                }
              </p>
            </div>
          </div>
        </div>

        {/* MARK ATTENDANCE - Primary CTA */}
        <Link href="/mark" className="block group">
          <div className="border-[3px] border-black bg-black text-white p-5 md:p-6 shadow-[6px_6px_0px_0px_rgba(251,191,36,1)] transition-all duration-200 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_rgba(251,191,36,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none dark:bg-slate-700 dark:border-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-yellow-400 border-[3px] border-white flex items-center justify-center group-hover:bg-yellow-300 transition-colors">
                  <CheckCircle size={28} className="text-black" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-1">
                    Mark Today&apos;s Attendance →
                  </h3>
                  <p className="text-sm md:text-base font-semibold text-white/80">
                    Tap here to log your classes for today
                  </p>
                </div>
              </div>
              <ChevronRight size={28} className="hidden md:block" />
            </div>
          </div>
        </Link>

        {/* QUICK STATS - Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <QuickStat
            label="Attendance"
            value={stats.total > 0 ? `${attendancePercent}%` : '--'}
            sublabel={`${stats.attended}/${stats.total} classes`}
            bgColor="bg-blue-400"
            textColor="text-black"
            icon={<TrendingUp size={20} />}
          />
          <QuickStat
            label="Today"
            value={todayClasses}
            sublabel="classes scheduled"
            bgColor="bg-purple-400"
            textColor="text-black"
            icon={<Calendar size={20} />}
          />
          <QuickStat
            label="Subjects"
            value={subjectCount}
            sublabel="being tracked"
            bgColor="bg-orange-400"
            textColor="text-black"
            icon={<BookOpen size={20} />}
          />
          <QuickStat
            label="Status"
            value={stats.total === 0 ? 'NEW' : isSafe ? 'SAFE' : 'AT RISK'}
            sublabel={stats.total === 0 ? 'setup needed' : isSafe ? 'keep going!' : 'act now!'}
            bgColor={stats.total === 0 ? "bg-yellow-400" : isSafe ? "bg-green-400" : "bg-red-500"}
            textColor={isSafe || stats.total === 0 ? "text-black" : "text-white"}
            icon={<Zap size={20} />}
          />
        </div>

        {/* HELPFUL TIP / ONBOARDING */}
        {stats.total === 0 && subjectCount === 0 && (
          <BrutalCard className="bg-yellow-400" hoverable={false}>
            <h3 className="text-2xl font-black text-black mb-4">🎯 Get Started</h3>
            <p className="text-black text-lg font-semibold mb-6">
              Start by adding your subjects and setting up your timetable to begin tracking attendance.
            </p>
            <div className="flex flex-wrap gap-4">
              <BrutalButton href="/subjects" variant="primary">
                <BookOpen size={18} className="mr-2" /> Add Subjects
              </BrutalButton>
              <BrutalButton href="/timetable">
                <Calendar size={18} className="mr-2" /> Setup Timetable
              </BrutalButton>
            </div>
          </BrutalCard>
        )}

        {/* LOW ATTENDANCE WARNING */}
        {stats.total > 0 && !isSafe && (
          <BrutalCard className="bg-red-100 dark:bg-red-900/50" hoverable={false}>
            <h3 className="text-2xl font-black text-red-600 dark:text-red-400 mb-4">
              ⚠️ Attendance at Risk
            </h3>
            <p className="text-black dark:text-white text-lg font-semibold mb-6">
              Your attendance is below 75%. Check your analytics to see which subjects need attention.
            </p>
            <BrutalButton href="/analytics" variant="danger">
              <PieChart size={18} className="mr-2" /> View Analytics
            </BrutalButton>
          </BrutalCard>
        )}

        {/* MANAGEMENT GRID - Bento Style */}
        <h2 className="text-2xl font-black text-black dark:text-white pt-4">
          📚 Manage Your Classes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Card 1: Subjects */}
          <Link href="/subjects" className="block">
            <BrutalCard className="h-full bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50">
              <div className="h-14 w-14 bg-blue-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-5">
                <BookOpen size={28} />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-black dark:text-white mb-3">
                Subjects
              </h3>
              <p className="text-black dark:text-white text-base font-semibold leading-relaxed">
                Add your classes and set attendance targets. Manage up to 10 subjects.
              </p>
            </BrutalCard>
          </Link>

          {/* Card 2: Timetable */}
          <Link href="/timetable" className="block">
            <BrutalCard className="h-full bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50">
              <div className="h-14 w-14 bg-purple-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-5">
                <Calendar size={28} />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-black dark:text-white mb-3">
                Timetable
              </h3>
              <p className="text-black dark:text-white text-base font-semibold leading-relaxed">
                Set your weekly schedule with breaks, sports, and study hours.
              </p>
            </BrutalCard>
          </Link>

          {/* Card 3: Analytics */}
          <Link href="/analytics" className="block md:col-span-2 lg:col-span-1">
            <BrutalCard className="h-full bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50">
              <div className="h-14 w-14 bg-green-500 border-[3px] border-black dark:border-white flex items-center justify-center text-white mb-5">
                <PieChart size={28} />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-black dark:text-white mb-3">
                Analytics
              </h3>
              <p className="text-black dark:text-white text-base font-semibold leading-relaxed">
                View detailed stats, track progress, and get actionable insights.
              </p>
            </BrutalCard>
          </Link>
        </div>
      </main>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
