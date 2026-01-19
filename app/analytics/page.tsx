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
  Edit2
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

      // Process remaining logs (extra classes not in timetable)
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
          bunkMsg = `You can miss up to ${maxBunks} more class${maxBunks === 1 ? '' : 'es'} (if you attend all others) and still meet your ${target}% target.`;
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

  if (dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 gap-3 transition-colors">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-500" size={32} />
        <p className="font-medium animate-pulse">Calculating Analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 p-4 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex-1">Analytics</h1>
        </div>
        {analyticsData.semesterInfo.start && (
          <p className="text-xs text-slate-500 dark:text-slate-400 ml-12">
            Semester started: {analyticsData.semesterInfo.start} • {analyticsData.semesterInfo.daysElapsed} days elapsed
          </p>
        )}
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        {/* 1. HERO CARD (OVERALL) */}
        <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-900/20 dark:shadow-blue-500/10 relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="text-center md:text-left space-y-4">
              <div>
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Overall Attendance</h2>
                <div className="text-5xl md:text-6xl font-bold tracking-tight">
                  {analyticsData.overall.percentage.toFixed(0)}<span className="text-3xl text-slate-500">%</span>
                </div>
              </div>
              <div className="inline-flex gap-4 bg-slate-800/80 dark:bg-slate-700/80 backdrop-blur-sm p-3 rounded-xl text-sm border border-slate-700/50 dark:border-slate-600/50 shadow-inner">
                <div className="flex flex-col items-center px-2">
                  <span className="text-green-400 dark:text-green-500 font-bold text-lg">{analyticsData.overall.attended}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Present</span>
                </div>
                <div className="w-px bg-slate-700 dark:bg-slate-600"></div>
                <div className="flex flex-col items-center px-2">
                  <span className="text-red-400 dark:text-red-500 font-bold text-lg">{analyticsData.overall.total - analyticsData.overall.attended}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Absent</span>
                </div>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                <path className="text-slate-800 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path className={clsx("transition-all duration-1000 ease-out", analyticsData.overall.percentage >= 75 ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400")} strokeDasharray={`${analyticsData.overall.percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Classes</span>
                <span className="text-xl font-bold text-white">{analyticsData.overall.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. SUBJECT BREAKDOWN WITH SORT CONTROLS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Subject Breakdown</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('status')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortBy === 'status' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                Status
              </button>
              <button
                onClick={() => setSortBy('percentage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortBy === 'percentage' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                %
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortBy === 'name' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                A-Z
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sortedStats.map((sub) => (
              <div key={sub.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: sub.color }}></div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-lg">{sub.name}</h3>
                      <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-md"><CheckCircle size={12}/> {sub.attended} Present</span>
                        <span className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-md"><XCircle size={12}/> {sub.bunked} Absent</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={clsx("text-2xl font-bold", sub.percentage >= sub.target ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500")}>
                      {sub.percentage.toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Goal: {sub.target}%</div>
                  </div>
                  <Link href="/mark" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Edit attendance">
                    <Edit2 size={18} className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400" />
                  </Link>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                  <div className={clsx("h-full rounded-full transition-all duration-500", sub.percentage >= sub.target ? "bg-green-500 dark:bg-green-400" : "bg-red-500 dark:bg-red-400")} style={{ width: `${sub.percentage}%` }} />
                </div>
                <div className={clsx("p-3 rounded-xl flex items-start gap-3 text-sm font-medium border", sub.status === 'Safe' ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-100 dark:border-green-800" : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-100 dark:border-red-800")}>
                  {sub.status === 'Safe' ? <ShieldCheck className="shrink-0 text-green-600 dark:text-green-500 mt-0.5" size={18} /> : <AlertTriangle className="shrink-0 text-red-600 dark:text-red-500 mt-0.5" size={18} />}
                  <div>{sub.bunkMsg}</div>
                </div>
              </div>
            ))}

            {analyticsData.stats.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Info className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={32} />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No subjects found.</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Add subjects in the Subjects page to see analytics.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
