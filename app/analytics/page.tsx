'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, ShieldCheck, 
  Loader2, Info, Bug 
} from 'lucide-react';
import Link from 'next/link';
import { 
  eachDayOfInterval, isSunday, parseISO, isBefore, 
  startOfToday, format, startOfMonth, getDay as getDayOfWeek, addDays
} from 'date-fns';
import { clsx } from 'clsx';

// --- TYPES ---
type SubjectStats = {
  id: string;
  name: string;
  color: string;
  target: number;
  totalClasses: number;
  attended: number;
  bunked: number;
  percentage: number;
  status: 'Safe' | 'Danger' | 'On Track';
  bunkMsg: string;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubjectStats[]>([]);
  const [overall, setOverall] = useState({ attended: 0, total: 0, percentage: 100 });
  const [semesterInfo, setSemesterInfo] = useState({ start: '', daysElapsed: 0 });
  const [resetting, setResetting] = useState(false);
  
  // Debug State - Always visible for debugging
  const [debugLogs, setDebugLogs] = useState<Array<{ date?: string; status?: string; subject_id?: string }>>([]);

  useEffect(() => {
    const calculateAnalytics = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. FETCH ALL DATA
      const [profileRes, subRes, timeRes, holidayRes, logRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('subjects').select('*').eq('user_id', user.id),
        supabase.from('timetable_slots').select('*').eq('user_id', user.id),
        supabase.from('holidays').select('*').eq('user_id', user.id),
        supabase.from('attendance_logs').select('*').eq('user_id', user.id)
      ]);

      if (!profileRes.data || !subRes.data) {
        setLoading(false);
        return;
      }

      const profile = profileRes.data;
      const subjects = subRes.data;
      const timetable = timeRes.data || [];
      const holidays = holidayRes.data || [];
      const logs = logRes.data || [];
      
      // Set debug logs (always visible for debugging)
      setDebugLogs(logs);

      // 2. SETUP TIME RANGE
      const today = startOfToday();
      const startDate = parseISO(profile.semester_start);

      // Validate Semester Start
      if (!profile.semester_start || isBefore(today, startDate)) {
        setSemesterInfo({ start: 'Not Started', daysElapsed: 0 });
        setLoading(false);
        return; 
      }

      const daysInterval = eachDayOfInterval({ start: startDate, end: today });
      setSemesterInfo({ 
        start: format(startDate, 'MMM d, yyyy'), 
        daysElapsed: daysInterval.length 
      });

      // 3. INITIALIZE COUNTERS
      const subjectMap: Record<string, { total: number, attended: number, bunked: number }> = {};
      subjects.forEach((s) => {
        subjectMap[s.id] = { total: 0, attended: 0, bunked: 0 };
      });

      // 4. THE DETECTIVE LOOP 🕵️‍♂️
      daysInterval.forEach(dayObj => {
        // Target Date String: "2026-01-16"
        const dateStr = format(dayObj, 'yyyy-MM-dd');

        // A. Skip Sundays
        if (isSunday(dayObj)) return;

        // B. Skip Holidays
        // Safe check: handle if h.date is undefined or different format
        const isHoliday = holidays.some((h: any) => h.date && h.date.substring(0, 10) === dateStr);
        if (isHoliday) return;

        // C. Skip Rule Saturdays - Using date-fns only (no raw Date())
        const dayOfWeekIndex = getDayOfWeek(dayObj); 
        if (dayOfWeekIndex === 6) {
          // Calculate which Saturday of the month (1st, 2nd, 3rd, 4th, 5th)
          // Find the first Saturday of the month using date-fns only
          const firstOfMonth = startOfMonth(dayObj);
          let firstSaturday: Date | null = null;
          
          // Find first Saturday using date-fns addDays
          for (let i = 0; i < 7; i++) {
            const candidateDate = addDays(firstOfMonth, i);
            if (getDayOfWeek(candidateDate) === 6) {
              firstSaturday = candidateDate;
              break;
            }
          }
          
          if (firstSaturday) {
            // Calculate days difference using date-fns
            const daysDiff = Math.floor((dayObj.getTime() - firstSaturday.getTime()) / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(daysDiff / 7) + 1;
            if (weekNum >= 1 && weekNum <= 5 && profile.saturday_offs && profile.saturday_offs.includes(weekNum)) {
              return;
            }
          }
        }

        // D. Find Classes for this day
        const dbDay = dayOfWeekIndex === 0 ? 7 : dayOfWeekIndex;
        const classesForDay = timetable.filter((t: any) => 
          t.day_of_week === dbDay && t.slot_type === 'SUBJECT'
        );

        // PREPARE LOGS FOR THIS DAY (Optimization: Filter logs once per day)
        // We match strictly on the first 10 chars "YYYY-MM-DD"
        let daysLogs = logs.filter((l) => l.date && typeof l.date === 'string' && l.date.substring(0, 10) === dateStr);

        classesForDay.forEach((cls) => {
          if (!subjectMap[cls.subject_id]) return;

          // E. Find a matching log for this specific subject
          // 🔥 CRITICAL FIX: Find index so we can CONSUME the log (handle multiple classes same day)
          const logIndex = daysLogs.findIndex((l) => l.subject_id === cls.subject_id);
          
          let log = null;
          if (logIndex !== -1) {
             log = daysLogs[logIndex];
             // Remove used log so next class doesn't reuse it
             daysLogs.splice(logIndex, 1);
          }

          // Logic: Cancelled = Neutral. Present = +1. Else = Absent.
          if (log?.status === 'CANCELLED') return;

          subjectMap[cls.subject_id].total++;

          if (log?.status === 'PRESENT') {
            subjectMap[cls.subject_id].attended++;
          } else {
            subjectMap[cls.subject_id].bunked++;
          }
        });
      });

      // 5. COMPILE RESULTS
      let grandTotal = 0;
      let grandAttended = 0;

      const finalStats: SubjectStats[] = subjects.map((sub) => {
        const { total, attended, bunked } = subjectMap[sub.id];
        grandTotal += total;
        grandAttended += attended;

        const percentage = total === 0 ? 100 : (attended / total) * 100;
        const target = sub.target_percentage;

        let bunkMsg = "";
        let status: SubjectStats['status'] = 'On Track';

        if (total === 0) {
          bunkMsg = "No classes scheduled yet.";
          status = 'Safe';
        } else if (percentage >= target) {
          // Calculate how many more classes can be missed while maintaining target
          // This assumes you'll attend all other future classes
          // Formula: max_total = attended / target_percentage
          // Then: max_missable = max_total - current_total
          const maxTotalAllowed = attended / (target / 100);
          const maxBunks = Math.floor(maxTotalAllowed - total);
          
          if (maxBunks > 0) {
            bunkMsg = `You can miss up to ${maxBunks} more class${maxBunks === 1 ? '' : 'es'} (if you attend all others) and still meet your ${target}% target.`;
            status = 'Safe';
          } else {
            bunkMsg = `You're at ${percentage.toFixed(0)}% (target: ${target}%). Keep attending to maintain your target.`;
            status = 'Safe';
          }
        } else {
          // Calculate how many classes need to be attended to reach target
          // Formula: (target * total - attended) / (1 - target/100)
          const numerator = (target / 100 * total) - attended;
          const denominator = 1 - (target / 100);
          const mustAttend = denominator === 0 ? 1 : Math.ceil(numerator / denominator);
          
          if (mustAttend === 1) {
            bunkMsg = `Attend the next class to reach your ${target}% target.`;
          } else {
            bunkMsg = `Attend the next ${mustAttend} classes to reach your ${target}% target.`;
          }
          status = 'Danger';
        }

        return {
          id: sub.id,
          name: sub.name,
          color: sub.color_hex,
          target,
          totalClasses: total,
          attended,
          bunked,
          percentage,
          status,
          bunkMsg
        };
      });

      const overallPct = grandTotal === 0 ? 100 : (grandAttended / grandTotal) * 100;

      setOverall({
        attended: grandAttended,
        total: grandTotal,
        percentage: overallPct
      });

      setStats(finalStats);
      setLoading(false);
    };

    calculateAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Reset Start Date Handler
  const handleResetStartDate = async () => {
    if (!confirm('Reset semester start date to today? This will recalculate all analytics from today onwards.')) {
      return;
    }

    setResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const todayStr = format(startOfToday(), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('profiles')
        .update({ semester_start: todayStr })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // Reload analytics
      window.location.reload();
    } catch (err) {
      console.error('Error resetting start date:', err);
      alert('Failed to reset start date. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 bg-slate-50 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="font-medium animate-pulse">Calculating Analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* HEADER */}
      <div className="bg-white p-4 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800 flex-1">Analytics</h1>
          <button
            onClick={handleResetStartDate}
            disabled={resetting}
            className="px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Reset semester start date to today"
          >
            {resetting ? 'Resetting...' : 'Reset Start Date'}
          </button>
        </div>
        {semesterInfo.start && (
          <p className="text-xs text-slate-500 ml-12">
            Semester started: {semesterInfo.start} • {semesterInfo.daysElapsed} days elapsed
          </p>
        )}
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">

        {/* 1. HERO CARD (OVERALL) */}
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="text-center md:text-left space-y-4">
              <div>
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Overall Attendance</h2>
                <div className="text-5xl md:text-6xl font-bold tracking-tight">
                  {overall.percentage.toFixed(0)}<span className="text-3xl text-slate-500">%</span>
                </div>
              </div>
              <div className="inline-flex gap-4 bg-slate-800/80 backdrop-blur-sm p-3 rounded-xl text-sm border border-slate-700/50 shadow-inner">
                <div className="flex flex-col items-center px-2">
                  <span className="text-green-400 font-bold text-lg">{overall.attended}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Present</span>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="flex flex-col items-center px-2">
                  <span className="text-red-400 font-bold text-lg">{overall.total - overall.attended}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Absent</span>
                </div>
              </div>
            </div>
            
            {/* Donut Chart */}
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path className={clsx("transition-all duration-1000 ease-out", overall.percentage >= 75 ? "text-green-500" : "text-red-500")} strokeDasharray={`${overall.percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-500 font-bold uppercase">Classes</span>
                <span className="text-xl font-bold text-white">{overall.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. SUBJECT BREAKDOWN */}
        <div className="grid grid-cols-1 gap-4">
          {stats.map((sub) => (
            <div key={sub.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: sub.color }}></div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{sub.name}</h3>
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md"><CheckCircle size={12}/> {sub.attended} Present</span>
                      <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-md"><XCircle size={12}/> {sub.bunked} Absent</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={clsx("text-2xl font-bold", sub.percentage >= sub.target ? "text-green-600" : "text-red-600")}>
                    {sub.percentage.toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Goal: {sub.target}%</div>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                <div className={clsx("h-full rounded-full transition-all duration-500", sub.percentage >= sub.target ? "bg-green-500" : "bg-red-500")} style={{ width: `${sub.percentage}%` }} />
              </div>
              <div className={clsx("p-3 rounded-xl flex items-start gap-3 text-sm font-medium border", sub.status === 'Safe' ? "bg-green-50 text-green-800 border-green-100" : "bg-red-50 text-red-800 border-red-100")}>
                {sub.status === 'Safe' ? <ShieldCheck className="shrink-0 text-green-600 mt-0.5" size={18} /> : <AlertTriangle className="shrink-0 text-red-600 mt-0.5" size={18} />}
                <div>{sub.bunkMsg}</div>
              </div>
            </div>
          ))}

          {stats.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <Info className="mx-auto text-slate-300 mb-3" size={32} />
              <p className="text-slate-500 font-medium">No subjects found.</p>
              <p className="text-slate-400 text-sm mt-1">Add subjects in the Subjects page to see analytics.</p>
            </div>
          )}
        </div>

        {/* 3. DEBUG SECTION - Always visible for debugging */}
        <div className="mt-8 border-t border-slate-200 pt-8">
          <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-4">
            <Bug size={16} /> Debug Data
          </h3>
          <div className="bg-slate-100 p-4 rounded-xl text-xs font-mono text-slate-600 overflow-x-auto">
            <p className="mb-2 font-bold">Logs found in Database ({debugLogs.length}):</p>
            {debugLogs.length === 0 ? (
              <p className="text-red-500">No logs found! Did you click Save on the Mark page?</p>
            ) : (
              debugLogs.map((l, i) => (
                <div key={i} className="mb-1 border-b border-slate-200 pb-1 last:border-0">
                  Date: <span className="text-blue-600 font-bold">{l.date}</span> | 
                  Status: {l.status} | 
                  SubID: {l.subject_id?.substring(0,6)}...
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}