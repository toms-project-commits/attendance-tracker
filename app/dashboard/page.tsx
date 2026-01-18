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

// Types for better type safety
interface QuickStatProps {
  label: string;
  value: string | number;
  sublabel: string;
  color?: string;
}

// Utility function for attendance calculations
const calculateAttendancePercentage = (attended: number, total: number): number => {
  return total > 0 ? Math.round((attended / total) * 100) : 0;
};

// Memoized Quick Stat Component
const QuickStat = memo<QuickStatProps>(({ label, value, sublabel, color = 'text-slate-600' }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-slate-400 mt-1">{sublabel}</div>
  </div>
));

QuickStat.displayName = 'QuickStat';

const Dashboard = memo(function Dashboard() {
  const router = useRouter();
  const { user, profile, subjects, timetable, holidays, logs, loading: dataLoading } = useStudentData();

  // Optimized auth check with useCallback
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
      <div className="min-h-screen flex items-center justify-center text-slate-500 bg-slate-50">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* TOP NAVIGATION */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          🎓 BunkSafe
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-2 transition-colors font-medium"
          aria-label="Sign out"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* WELCOME BANNER */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center justify-between gap-8 flex-col md:flex-row">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h2>
              <p className="text-blue-100 text-lg">Track every class. Own your attendance. No excuses.</p>
            </div>

            {/* Donut Chart */}
            {stats.total > 0 && (
              <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                  <path className="text-blue-400/30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path className={clsx("transition-all duration-1000 ease-out", (stats.attended / stats.total) * 100 >= 75 ? "text-green-400" : "text-orange-400")} strokeDasharray={`${(stats.attended / stats.total) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm text-blue-100 font-bold uppercase">Semester</span>
                  <span className="text-2xl font-bold text-white">{Math.round((stats.attended / stats.total) * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HERO ACTION: MARK ATTENDANCE */}
        <Link href="/mark" className="block transform transition-transform hover:scale-[1.01]" aria-label="Mark today's attendance">
          <div className="bg-slate-900 hover:bg-slate-800 transition-colors p-6 md:p-8 rounded-3xl shadow-xl flex items-center justify-between group cursor-pointer border border-slate-800">
             <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 group-hover:text-white group-hover:bg-blue-600 transition-all shadow-inner" aria-hidden="true">
                 <CheckCircle size={32} />
               </div>
               <div>
                 <h3 className="text-white font-bold text-xl mb-1">Mark Today's Attendance</h3>
                 <p className="text-slate-400 text-base group-hover:text-slate-300 transition-colors">
                   Tap here to log your classes for today.
                 </p>
               </div>
             </div>
             <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={28} aria-hidden="true" />
          </div>
        </Link>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat
            label="Attendance"
            value={stats.total > 0 ? `${calculateAttendancePercentage(stats.attended, stats.total)}%` : '--'}
            sublabel={`${stats.attended}/${stats.total} classes`}
            color="text-blue-600"
          />
          <QuickStat
            label="Today's Classes"
            value={todayClasses}
            sublabel="scheduled"
            color="text-green-600"
          />
          <QuickStat
            label="Subjects"
            value={subjectCount}
            sublabel="tracked"
            color="text-purple-600"
          />
          <QuickStat
            label="Status"
            value={stats.total === 0 ? 'Setup' : calculateAttendancePercentage(stats.attended, stats.total) >= 75 ? 'Safe' : 'Risk'}
            sublabel="attendance"
            color={stats.total === 0 ? 'text-slate-400' : calculateAttendancePercentage(stats.attended, stats.total) >= 75 ? 'text-green-600' : 'text-red-600'}
          />
        </div>

        {/* HELPFUL TIP */}
        {stats.total === 0 && subjectCount === 0 ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6">
            <h3 className="font-bold text-slate-800 mb-2">Get Started</h3>
            <p className="text-slate-600 text-sm mb-4">Start by adding your subjects and setting up your timetable to begin tracking attendance.</p>
            <div className="flex gap-3">
              <Link href="/subjects" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Add Subjects
              </Link>
              <Link href="/timetable" className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors text-sm">
                Setup Timetable
              </Link>
            </div>
          </div>
        ) : stats.total > 0 && (stats.attended / stats.total) * 100 < 75 ? (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-3xl p-6">
            <h3 className="font-bold text-slate-800 mb-2">⚠️ Attendance at Risk</h3>
            <p className="text-slate-600 text-sm mb-4">Your attendance is below 75%. Check your analytics to see which subjects need attention.</p>
            <Link href="/analytics" className="inline-block px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors text-sm">
              View Analytics
            </Link>
          </div>
        ) : null}

        {/* MANAGEMENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Subjects */}
          <Link href="/subjects">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group h-full">
              <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BookOpen size={28} />
              </div>
              <h3 className="font-bold text-slate-800 text-xl mb-2">Subjects</h3>
              <p className="text-slate-500 leading-relaxed">
                Add your classes and targets. You can manage up to 10 subjects easily.
              </p>
            </div>
          </Link>

          {/* Card 2: Timetable */}
          <Link href="/timetable">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-purple-100 transition-all cursor-pointer group h-full">
              <div className="h-14 w-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Calendar size={28} />
              </div>
              <h3 className="font-bold text-slate-800 text-xl mb-2">Timetable</h3>
              <p className="text-slate-500 leading-relaxed">
                Set your weekly schedule with breaks, sports, and study hours.
              </p>
            </div>
          </Link>

          {/* Card 3: Analytics */}
          <Link href="/analytics">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-green-100 transition-all cursor-pointer group h-full">
              <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-5 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <PieChart size={28} />
              </div>
              <h3 className="font-bold text-slate-800 text-xl mb-2">Analytics</h3>
              <p className="text-slate-500 leading-relaxed">
                View detailed stats, track progress, and get actionable insights.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
