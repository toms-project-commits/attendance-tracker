'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AttendanceCalendar from '@/components/AttendanceCalendar';
import { Loader2, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

interface AttendanceLog {
  date: string;
  status: string;
  subject_id: string;
}

interface Holiday {
  date: string;
}

interface Profile {
  semester_start: string;
  semester_end: string;
  saturday_offs: number[];
}

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch profile with semester info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('semester_start, semester_end, saturday_offs')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (!profileData?.semester_start || !profileData?.semester_end) {
          setError('Please complete your setup to view the calendar');
          setLoading(false);
          return;
        }

        setProfile(profileData as Profile);

        // Fetch attendance logs for the active semester
        const { data: logsData, error: logsError } = await supabase
          .from('attendance_logs')
          .select('date, status, subject_id')
          .eq('user_id', user.id)
          .gte('date', profileData.semester_start)
          .lte('date', profileData.semester_end)
          .order('date', { ascending: true });

        if (logsError) throw logsError;

        setLogs(logsData || []);

        // Fetch holidays
        const { data: holidaysData, error: holidaysError } = await supabase
          .from('holidays')
          .select('date')
          .eq('user_id', user.id)
          .gte('date', profileData.semester_start)
          .lte('date', profileData.semester_end)
          .order('date', { ascending: true });

        if (holidaysError) throw holidaysError;

        setHolidays(holidaysData || []);

      } catch (err) {
        console.error('Error loading calendar data:', err);
        setError('Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Calculate attendance stats
  const stats = useMemo(() => {
    if (!logs.length) return { present: 0, absent: 0, cancelled: 0, total: 0 };

    const present = logs.filter(log => log.status === 'PRESENT').length;
    const absent = logs.filter(log => log.status === 'ABSENT').length;
    const cancelled = logs.filter(log => log.status === 'CANCELLED').length;
    const total = present + absent;

    return { present, absent, cancelled, total };
  }, [logs]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white animate-pulse">
          <Loader2 className="animate-spin mx-auto mb-2 text-black" size={32} />
          <p className="font-black text-black">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-md w-full">
          <div className="border-[3px] border-black bg-red-400 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white text-center">
            <h2 className="text-2xl font-black text-black mb-4">⚠️ Setup Required</h2>
            <p className="text-base font-bold text-black mb-6">
              {error || 'Unable to load calendar data'}
            </p>
            <Link
              href="/setup"
              className={clsx(
                "inline-block px-6 py-3 font-bold text-white",
                "border-[3px] border-black bg-black",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                "transition-all duration-150"
              )}
            >
              Go to Setup
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--background)' }}>
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white px-4 md:px-6 py-4 sticky top-0 z-50 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-black dark:text-white font-bold hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-black text-black dark:text-white flex items-center gap-2">
            <CalendarIcon size={24} /> Attendance Calendar
          </h1>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="border-[3px] border-black bg-purple-500 text-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <h2 className="text-3xl md:text-4xl font-black mb-2">
            📅 Your Attendance Calendar
          </h2>
          <p className="text-lg font-bold opacity-90">
            View your monthly attendance at a glance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border-[3px] border-black bg-green-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
            <div className="text-xs font-black uppercase tracking-wider text-black mb-1">Present</div>
            <div className="text-3xl font-black text-black">{stats.present}</div>
            <div className="text-sm font-semibold text-black opacity-80">classes</div>
          </div>

          <div className="border-[3px] border-black bg-red-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
            <div className="text-xs font-black uppercase tracking-wider text-black mb-1">Absent</div>
            <div className="text-3xl font-black text-black">{stats.absent}</div>
            <div className="text-sm font-semibold text-black opacity-80">classes</div>
          </div>

          <div className="border-[3px] border-black bg-yellow-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
            <div className="text-xs font-black uppercase tracking-wider text-black mb-1">Cancelled</div>
            <div className="text-3xl font-black text-black">{stats.cancelled}</div>
            <div className="text-sm font-semibold text-black opacity-80">classes</div>
          </div>

          <div className="border-[3px] border-black bg-blue-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
            <div className="text-xs font-black uppercase tracking-wider text-black mb-1">Percentage</div>
            <div className="text-3xl font-black text-black">
              {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
            </div>
            <div className="text-sm font-semibold text-black opacity-80">attendance</div>
          </div>
        </div>

        {/* Calendar Component */}
        <AttendanceCalendar
          logs={logs}
          holidays={holidays}
          saturdayOffs={profile.saturday_offs || []}
          semesterStart={profile.semester_start}
          semesterEnd={profile.semester_end}
        />

        {/* Info Box */}
        <div className="border-[3px] border-black bg-blue-100 dark:bg-blue-900/30 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <h3 className="text-lg font-black text-black dark:text-white mb-2 flex items-center gap-2">
            ℹ️ How to Read the Calendar
          </h3>
          <ul className="space-y-1 text-sm font-semibold text-black dark:text-white">
            <li>• <span className="font-black text-green-600">Green</span> - Classes you attended</li>
            <li>• <span className="font-black text-red-600">Red</span> - Classes you missed</li>
            <li>• <span className="font-black text-yellow-600">Yellow</span> - Days with unmarked attendance</li>
            <li>• <span className="font-black text-gray-600">Gray</span> - Holidays and weekends</li>
            <li>• Cancelled classes are not counted toward your attendance</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
