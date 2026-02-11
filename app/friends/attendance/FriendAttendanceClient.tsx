'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Target, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { calculateAttendance } from '@/lib/utils/attendanceCalculations';

type FriendProfile = {
  id: string;
  username: string;
  full_name: string | null;
  semester_start: string | null;
  saturday_offs: number[] | null;
};

function FriendAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const friendId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [attendanceData, setAttendanceData] = useState<any>(null);

  const loadFriendAttendance = useCallback(async () => {
    if (!friendId) {
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Verify friendship
      const { data: friendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_id', friendId)
        .single();

      if (friendshipError || !friendship) {
        setIsFriend(false);
        setLoading(false);
        return;
      }

      setIsFriend(true);

      // Load friend's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, semester_start, saturday_offs')
        .eq('id', friendId)
        .single();

      if (profileError) throw profileError;
      setFriendProfile(profile);

      // Load friend's subjects — propagate RLS errors instead of silently returning []
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', friendId);
      if (subjectsError) throw subjectsError;

      // Load friend's timetable
      const { data: timetable, error: timetableError } = await supabase
        .from('timetable_slots')
        .select('*')
        .eq('user_id', friendId);
      if (timetableError) throw timetableError;

      // Load friend's holidays
      const { data: holidays, error: holidaysError } = await supabase
        .from('holidays')
        .select('*')
        .eq('user_id', friendId);
      if (holidaysError) throw holidaysError;

      // Load friend's attendance logs
      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', friendId);
      if (logsError) throw logsError;

      // Calculate attendance using centralized logic
      const calculated = calculateAttendance(
        profile,
        subjects || [],
        timetable || [],
        holidays || [],
        logs || []
      );

      setAttendanceData(calculated);

    } catch (error) {
      console.error('Error loading friend attendance:', error);
      // Set empty data to avoid showing stale/incorrect data
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  }, [friendId, router]);

  useEffect(() => {
    if (friendId) {
      loadFriendAttendance();
    }
  }, [friendId, loadFriendAttendance]);

  if (!friendId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-md w-full border-[3px] border-black bg-white dark:bg-slate-800 p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
          <Lock size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-black text-black dark:text-white mb-4">Invalid Link</h1>
          <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-6">
            No friend ID was provided in the URL.
          </p>
          <Link
            href="/friends"
            className={clsx(
              "inline-block px-6 py-3 border-[3px] border-black bg-blue-500 text-white font-black",
              "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
              "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
              "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
              "transition-all duration-150",
              "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            )}
          >
            Back to Friends
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <Loader2 className="animate-spin mx-auto mb-3 text-black" size={40} />
          <p className="font-black text-black text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isFriend) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-md w-full border-[3px] border-black bg-white dark:bg-slate-800 p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
          <Lock size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-black text-black dark:text-white mb-4">Access Denied</h1>
          <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-6">
            You need to be friends with this user to view their attendance.
          </p>
          <Link
            href="/friends"
            className={clsx(
              "inline-block px-6 py-3 border-[3px] border-black bg-blue-500 text-white font-black",
              "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
              "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
              "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
              "transition-all duration-150",
              "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            )}
          >
            Back to Friends
          </Link>
        </div>
      </div>
    );
  }

  const isSafe = attendanceData && attendanceData.overall.percentage >= 75;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeCount = attendanceData?.subjectStats.filter((s: any) => s.status === 'Safe').length || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dangerCount = attendanceData?.subjectStats.filter((s: any) => s.status === 'Danger').length || 0;

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white p-4 sticky top-0 z-40 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link 
              href="/friends" 
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
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border-[3px] border-black dark:border-white bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-lg font-black text-white">
                  {friendProfile?.full_name
                    ? friendProfile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    : friendProfile?.username.slice(0, 2).toUpperCase()
                  }
                </span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-black dark:text-white">
                  {friendProfile?.full_name || friendProfile?.username}&apos;s Attendance
                </h1>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  @{friendProfile?.username}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* OVERALL STATS */}
        <div 
          className={clsx(
            "border-[3px] border-black p-6",
            "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
            "dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
            isSafe ? "bg-green-400" : "bg-red-500"
          )}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className={clsx(
                "text-xs font-black uppercase tracking-widest mb-2",
                isSafe ? "text-green-800" : "text-white/80"
              )}>
                Overall Attendance
              </h2>
              <div className={clsx(
                "text-6xl md:text-7xl font-black",
                isSafe ? "text-black" : "text-white"
              )}>
                {attendanceData?.overall.percentage.toFixed(0) || 0}
                <span className={clsx(
                  "text-3xl",
                  isSafe ? "text-green-700" : "text-white/70"
                )}>%</span>
              </div>
            </div>

            <div className="relative w-40 h-40 shrink-0">
              <div className={clsx(
                "absolute inset-0 border-[3px] border-black rounded-full",
                "dark:border-white"
              )} />
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path 
                  className={isSafe ? "text-green-600/30" : "text-red-700/30"}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                />
                <path 
                  className={isSafe ? "text-black" : "text-white"}
                  strokeDasharray={`${attendanceData?.overall.percentage || 0}, 100`} 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={clsx(
                  "text-xs font-black uppercase",
                  isSafe ? "text-green-800" : "text-white/80"
                )}>Classes</span>
                <span className={clsx(
                  "text-3xl font-black",
                  isSafe ? "text-black" : "text-white"
                )}>{attendanceData?.overall.total || 0}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className={clsx("border-[3px] border-black p-3 text-center", isSafe ? "bg-white" : "bg-white/90")}>
              <div className="text-2xl font-black text-green-600">{attendanceData?.overall.attended || 0}</div>
              <div className="text-xs font-bold text-gray-600 uppercase">Present</div>
            </div>
            <div className={clsx("border-[3px] border-black p-3 text-center", isSafe ? "bg-white" : "bg-white/90")}>
              <div className="text-2xl font-black text-red-600">
                {(attendanceData?.overall.total || 0) - (attendanceData?.overall.attended || 0)}
              </div>
              <div className="text-xs font-bold text-gray-600 uppercase">Absent</div>
            </div>
            <div className={clsx("border-[3px] border-black p-3 text-center", isSafe ? "bg-white" : "bg-white/90")}>
              <div className="text-2xl font-black text-blue-600">{attendanceData?.subjectStats.length || 0}</div>
              <div className="text-xs font-bold text-gray-600 uppercase">Subjects</div>
            </div>
          </div>
        </div>

        {/* QUICK SUMMARY */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border-[3px] border-black bg-green-100 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-green-900/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-green-600" />
              <span className="text-xs font-black uppercase text-green-800 dark:text-green-400">Safe</span>
            </div>
            <div className="text-4xl font-black text-green-700 dark:text-green-400">{safeCount}</div>
            <div className="text-sm font-bold text-green-600 dark:text-green-500">subjects on track</div>
          </div>
          <div className="border-[3px] border-black bg-red-100 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-red-900/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={20} className="text-red-600" />
              <span className="text-xs font-black uppercase text-red-800 dark:text-red-400">At Risk</span>
            </div>
            <div className="text-4xl font-black text-red-700 dark:text-red-400">{dangerCount}</div>
            <div className="text-sm font-bold text-red-600 dark:text-red-500">need attention</div>
          </div>
        </div>

        {/* SUBJECT BREAKDOWN */}
        <div>
          <h2 className="text-xl font-black text-black dark:text-white mb-4">Subject Breakdown</h2>
          
          {attendanceData?.subjectStats.length === 0 ? (
            <div className="border-[3px] border-black border-dashed bg-white dark:bg-slate-800 p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <p className="text-lg font-black text-black dark:text-white">No subjects to display</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {attendanceData?.subjectStats.map((sub: any) => (
                <div 
                  key={sub.id} 
                  className={clsx(
                    "border-[3px] border-black bg-white p-5",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div 
                        className="w-3 h-16 border-[2px] border-black dark:border-white" 
                        style={{ backgroundColor: sub.color }}
                      />
                      <div>
                        <h3 className="font-black text-lg text-black dark:text-white">{sub.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="px-2 py-1 text-xs font-bold bg-gray-100 text-gray-800 border-[2px] border-black dark:border-white dark:bg-gray-700 dark:text-gray-300">
                            <Target size={12} className="inline mr-1"/> {sub.target}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={clsx(
                      "text-3xl font-black",
                      sub.percentage >= sub.target ? "text-green-600" : "text-red-600"
                    )}>
                      {sub.percentage.toFixed(0)}%
                    </div>
                  </div>

                  <div className="h-4 w-full bg-gray-200 border-[2px] border-black dark:border-white mb-4">
                    <div 
                      className={clsx(
                        "h-full transition-all duration-500",
                        sub.percentage >= sub.target ? "bg-green-500" : "bg-red-500"
                      )} 
                      style={{ width: `${Math.min(sub.percentage, 100)}%` }} 
                    />
                  </div>

                  <div className="flex gap-2 text-sm font-bold">
                    <span className="text-green-600">✓ {sub.attended} Present</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-red-600">✗ {sub.bunked} Absent</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 dark:text-gray-400">Total: {sub.totalClasses}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FriendAttendanceClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <Loader2 className="animate-spin mx-auto mb-3 text-black" size={40} />
          <p className="font-black text-black text-lg">Loading...</p>
        </div>
      </div>
    }>
      <FriendAttendanceContent />
    </Suspense>
  );
}
