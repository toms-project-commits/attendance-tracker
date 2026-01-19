'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Info,
  Edit2,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';
import Link from 'next/link';
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
import { clsx } from 'clsx';
import useStudentData from '@/lib/hooks/useStudentData';

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
  const [sortBy, setSortBy] = useState<'name' | 'percentage' | 'status'>('percentage');

  const { user, profile, subjects, timetable, holidays, logs, loading: dataLoading } = useStudentData();

  useEffect(() => {
    if (!dataLoading && !user) {
      router.push('/login');
    }
  }, [dataLoading, router, user]);

  const analyticsData = useMemo(() => {
    if (!profile) {
      return {
        semesterInfo: { start: '', daysElapsed: 0 },
        overall: { attended: 0, total: 0, percentage: 100 },
        stats: [] as SubjectStats[]
      };
    }

    if (!profile.semester_start) {
      return {
        semesterInfo: { start: 'Not Started', daysElapsed: 0 },
        overall: { attended: 0, total: 0, percentage: 100 },
        stats: [] as SubjectStats[]
      };
    }

    const today = startOfToday();
    const startDate = parseISO(profile.semester_start);

    if (isBefore(today, startDate)) {
      return {
        semesterInfo: { start: 'Not Started', daysElapsed: 0 },
        overall: { attended: 0, total: 0, percentage: 100 },
        stats: [] as SubjectStats[]
      };
    }

    const daysInterval = eachDayOfInterval({ start: startDate, end: today });
    const subjectMap: Record<string, { total: number; attended: number; bunked: number }> = {};

    subjects.forEach((s) => {
      subjectMap[s.id] = { total: 0, attended: 0, bunked: 0 };
    });

    daysInterval.forEach((dayObj) => {
      const dateStr = format(dayObj, 'yyyy-MM-dd');

      if (isSunday(dayObj)) return;

      const isHoliday = holidays.some((holiday) => holiday.date && holiday.date.substring(0, 10) === dateStr);
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

      const daysLogs = logs.filter((log) => log.date && typeof log.date === 'string' && log.date.substring(0, 10) === dateStr);

      classesForDay.forEach((cls) => {
        if (!subjectMap[cls.subject_id]) return;

        const logIndex = daysLogs.findIndex((log) => log.subject_id === cls.subject_id);

        let log = null;
        if (logIndex !== -1) {
          log = daysLogs[logIndex];
          daysLogs.splice(logIndex, 1);
        }

        if (log?.status === 'CANCELLED') return;

        subjectMap[cls.subject_id].total++;

        if (log?.status === 'PRESENT') {
          subjectMap[cls.subject_id].attended++;
        } else {
          subjectMap[cls.subject_id].bunked++;
        }
      });

      daysLogs.forEach((log) => {
        if (!log.subject_id || !subjectMap[log.subject_id]) return;

        if (log.status === 'CANCELLED') return;

        subjectMap[log.subject_id].total++;

        if (log.status === 'PRESENT') {
          subjectMap[log.subject_id].attended++;
        } else {
          subjectMap[log.subject_id].bunked++;
        }
      });
    });

    let grandTotal = 0;
    let grandAttended = 0;

    const finalStats: SubjectStats[] = subjects.map((sub) => {
      const { total, attended, bunked } = subjectMap[sub.id] ?? { total: 0, attended: 0, bunked: 0 };
      grandTotal += total;
      grandAttended += attended;

      const percentage = total === 0 ? 100 : (attended / total) * 100;
      const target = sub.target_percentage;

      let bunkMsg = '';
      let status: SubjectStats['status'] = 'On Track';

      if (total === 0) {
        bunkMsg = 'No classes scheduled yet.';
        status = 'Safe';
      } else if (percentage >= target) {
        const maxTotalAllowed = attended / (target / 100);
        const maxBunks = Math.floor(maxTotalAllowed - total);

        if (maxBunks > 0) {
          bunkMsg = `You can miss up to ${maxBunks} more class${maxBunks === 1 ? '' : 'es'} and still meet your ${target}% target.`;
          status = 'Safe';
        } else {
          bunkMsg = `You're at ${percentage.toFixed(0)}% (target: ${target}%). Keep attending to maintain your target.`;
          status = 'Safe';
        }
      } else {
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

    return {
      semesterInfo: {
        start: format(startDate, 'MMM d, yyyy'),
        daysElapsed: daysInterval.length
      },
      overall: {
        attended: grandAttended,
        total: grandTotal,
        percentage: overallPct
      },
      stats: finalStats
    };
  }, [holidays, logs, profile, subjects, timetable]);

  const sortedStats = useMemo(() => {
    const sorted = [...analyticsData.stats];
    switch (sortBy) {
      case 'percentage':
        return sorted.sort((a, b) => b.percentage - a.percentage);
      case 'status':
        const statusOrder = { Danger: 0, 'On Track': 1, Safe: 2 };
        return sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }, [analyticsData.stats, sortBy]);

  const isSafe = analyticsData.overall.percentage >= 75;
  const safeCount = analyticsData.stats.filter(s => s.status === 'Safe').length;
  const dangerCount = analyticsData.stats.filter(s => s.status === 'Danger').length;

  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <Loader2 className="animate-spin mx-auto mb-3 text-black" size={40} />
          <p className="font-black text-black text-lg">Calculating Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--background)' }}>
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white p-4 sticky top-0 z-40 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
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
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-black text-black dark:text-white">
                📊 Analytics
              </h1>
              {analyticsData.semesterInfo.start && analyticsData.semesterInfo.start !== 'Not Started' && (
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Started: {analyticsData.semesterInfo.start} • {analyticsData.semesterInfo.daysElapsed} days
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* OVERALL STATUS - HERO CARD */}
        <div 
          className={clsx(
            "border-[3px] border-black p-6 md:p-8",
            "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
            "dark:border-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]",
            isSafe ? "bg-green-400" : "bg-red-500"
          )}
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left: Stats */}
            <div className="text-center lg:text-left">
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
                {analyticsData.overall.percentage.toFixed(0)}
                <span className={clsx(
                  "text-3xl",
                  isSafe ? "text-green-700" : "text-white/70"
                )}>%</span>
              </div>
              
              {/* Status Badge */}
              <div className={clsx(
                "inline-flex items-center gap-2 mt-4 px-4 py-2 border-[3px] border-black font-black text-sm",
                isSafe ? "bg-white text-green-700" : "bg-white text-red-600"
              )}>
                {isSafe ? (
                  <>
                    <ShieldCheck size={20} />
                    YOU&apos;RE SAFE! ✅
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} />
                    AT RISK! ⚠️
                  </>
                )}
              </div>
            </div>

            {/* Right: Donut Chart */}
            <div className="relative w-40 h-40 md:w-48 md:h-48 shrink-0">
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
                  strokeDasharray={`${analyticsData.overall.percentage}, 100`} 
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
                )}>{analyticsData.overall.total}</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className={clsx(
              "border-[3px] border-black p-3 text-center",
              isSafe ? "bg-white" : "bg-white/90"
            )}>
              <div className="text-2xl font-black text-green-600">{analyticsData.overall.attended}</div>
              <div className="text-xs font-bold text-gray-600 uppercase">Present</div>
            </div>
            <div className={clsx(
              "border-[3px] border-black p-3 text-center",
              isSafe ? "bg-white" : "bg-white/90"
            )}>
              <div className="text-2xl font-black text-red-600">{analyticsData.overall.total - analyticsData.overall.attended}</div>
              <div className="text-xs font-bold text-gray-600 uppercase">Absent</div>
            </div>
            <div className={clsx(
              "border-[3px] border-black p-3 text-center",
              isSafe ? "bg-white" : "bg-white/90"
            )}>
              <div className="text-2xl font-black text-blue-600">{analyticsData.stats.length}</div>
              <div className="text-xs font-bold text-gray-600 uppercase">Subjects</div>
            </div>
          </div>
        </div>

        {/* QUICK SUMMARY CARDS */}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-black text-black dark:text-white"> Subject Breakdown</h2>
            
            {/* Sort Buttons */}
            <div className="flex gap-2">
              {(['status', 'percentage', 'name'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={clsx(
                    "px-3 py-2 border-[3px] border-black font-black text-xs uppercase transition-all duration-150",
                    sortBy === option 
                      ? "bg-blue-500 text-white shadow-none translate-x-[2px] translate-y-[2px]"
                      : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "dark:border-white",
                    sortBy === option 
                      ? "dark:shadow-none"
                      : "dark:bg-slate-700 dark:text-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                  )}
                >
                  {option === 'percentage' ? '%' : option === 'name' ? 'A-Z' : option}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sortedStats.map((sub) => (
              <div 
                key={sub.id} 
                className={clsx(
                  "border-[3px] border-black bg-white p-5",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="w-3 h-16 border-[2px] border-black dark:border-white" 
                      style={{ backgroundColor: sub.color }}
                    />
                    <div>
                      <h3 className="font-black text-lg text-black dark:text-white">{sub.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-green-100 text-green-800 border-[2px] border-black dark:border-white dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle size={12}/> {sub.attended}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-red-100 text-red-800 border-[2px] border-black dark:border-white dark:bg-red-900/30 dark:text-red-400">
                          <XCircle size={12}/> {sub.bunked}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-gray-100 text-gray-800 border-[2px] border-black dark:border-white dark:bg-gray-700 dark:text-gray-300">
                          <Target size={12}/> {sub.target}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Percentage */}
                  <div className="text-right">
                    <div className={clsx(
                      "text-3xl font-black",
                      sub.percentage >= sub.target ? "text-green-600" : "text-red-600"
                    )}>
                      {sub.percentage.toFixed(0)}%
                    </div>
                  </div>
                  
                  {/* Edit Button */}
                  <Link 
                    href="/mark" 
                    className={clsx(
                      "ml-3 p-2 border-[2px] border-black bg-blue-100",
                      "hover:bg-blue-500 hover:text-white",
                      "transition-all duration-150",
                      "dark:border-white dark:bg-blue-900/30 dark:hover:bg-blue-500"
                    )}
                    title="Edit attendance"
                  >
                    <Edit2 size={18} />
                  </Link>
                </div>

                {/* Progress Bar */}
                <div className="h-4 w-full bg-gray-200 border-[2px] border-black dark:border-white mb-4">
                  <div 
                    className={clsx(
                      "h-full transition-all duration-500",
                      sub.percentage >= sub.target ? "bg-green-500" : "bg-red-500"
                    )} 
                    style={{ width: `${Math.min(sub.percentage, 100)}%` }} 
                  />
                </div>

                {/* Status Message */}
                <div className={clsx(
                  "p-4 border-[3px] border-black flex items-start gap-3 font-bold",
                  sub.status === 'Safe' 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                )}>
                  {sub.status === 'Safe' ? (
                    <ShieldCheck className="shrink-0 mt-0.5" size={20} />
                  ) : (
                    <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                  )}
                  <div className="text-sm">{sub.bunkMsg}</div>
                </div>
              </div>
            ))}

            {analyticsData.stats.length === 0 && (
              <div className="border-[3px] border-black border-dashed bg-white p-8 text-center dark:bg-slate-800 dark:border-white">
                <div className="w-16 h-16 bg-blue-500 border-[3px] border-black dark:border-white mx-auto mb-4 flex items-center justify-center">
                  <Info className="text-white" size={32} />
                </div>
                <p className="text-xl font-black text-black dark:text-white">No subjects found</p>
                <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-2">
                  Add subjects to see your analytics.
                </p>
                <Link 
                  href="/subjects"
                  className={clsx(
                    "inline-block mt-4 px-6 py-3 border-[3px] border-black bg-blue-500 text-white font-black",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    "transition-all duration-150",
                    "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                >
                  ➕ Add Subjects
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
