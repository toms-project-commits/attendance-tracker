/**
 * Centralized Attendance Calculation Logic
 * Used by both Dashboard and Analytics to ensure consistency
 */

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

export type Subject = {
  id: string;
  name: string;
  color_hex: string;
  target_percentage: number;
};

export type TimetableSlot = {
  id: string;
  subject_id: string;
  day_of_week: number;
  slot_type: string;
  start_time?: string | null;
  end_time?: string | null;
};

export type Holiday = {
  date: string;
  name?: string | null;
};

export type AttendanceLog = {
  date: string;
  status: string;
  subject_id?: string | null;
  timetable_slot_id?: string | null;
};

export type Profile = {
  semester_start?: string | null;
  saturday_offs?: number[] | null;
};

export type SubjectStats = {
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

export type AttendanceStats = {
  attended: number;
  total: number;
  percentage: number;
};

/**
 * Calculate attendance statistics for all subjects
 * This is the SINGLE SOURCE OF TRUTH for attendance calculations
 */
export function calculateAttendance(
  profile: Profile | null,
  subjects: Subject[],
  timetable: TimetableSlot[],
  holidays: Holiday[],
  logs: AttendanceLog[]
): { overall: AttendanceStats; subjectStats: SubjectStats[] } {
  if (!profile?.semester_start) {
    return {
      overall: { attended: 0, total: 0, percentage: 100 },
      subjectStats: []
    };
  }

  const today = startOfToday();
  const startDate = parseISO(profile.semester_start);

  if (isBefore(today, startDate)) {
    return {
      overall: { attended: 0, total: 0, percentage: 100 },
      subjectStats: []
    };
  }

  const daysInterval = eachDayOfInterval({ start: startDate, end: today });
  const subjectMap: Record<string, { total: number; attended: number; bunked: number }> = {};

  // Initialize subject map
  subjects.forEach((s) => {
    subjectMap[s.id] = { total: 0, attended: 0, bunked: 0 };
  });

  // Process each day
  daysInterval.forEach((dayObj) => {
    const dateStr = format(dayObj, 'yyyy-MM-dd');

    // Skip Sundays
    if (isSunday(dayObj)) return;

    // Skip holidays
    const isHoliday = holidays.some((holiday) => 
      holiday.date && holiday.date.substring(0, 10) === dateStr
    );
    if (isHoliday) return;

    // Handle Saturday offs
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

    const daysLogs = logs.filter((log) => 
      log.date && typeof log.date === 'string' && log.date.substring(0, 10) === dateStr
    );

    // Track which log indices have been consumed by timetable matches
    const consumedLogIndices = new Set<number>();

    // Process timetable-based classes
    classesForDay.forEach((cls) => {
      if (!subjectMap[cls.subject_id]) return;

      // Match log by timetable_slot_id for accuracy
      const logIndex = daysLogs.findIndex((log, idx) => !consumedLogIndices.has(idx) && log.timetable_slot_id === cls.id);

      let log = null;
      if (logIndex !== -1) {
        log = daysLogs[logIndex];
        consumedLogIndices.add(logIndex);
      }

      if (log?.status === 'CANCELLED') return;

      // Only count classes that have been explicitly marked.
      // Unmarked classes (no log entry) are NOT counted — they haven't happened
      // or the user hasn't recorded them yet. Counting them as absent would
      // produce silently incorrect percentages, especially for today's classes.
      if (!log) return;

      subjectMap[cls.subject_id].total++;

      if (log.status === 'PRESENT') {
        subjectMap[cls.subject_id].attended++;
      } else {
        subjectMap[cls.subject_id].bunked++;
      }
    });

    // Process extra classes (not in timetable) — skip already-consumed logs
    daysLogs.forEach((log, idx) => {
      if (consumedLogIndices.has(idx)) return;
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

  // Calculate overall statistics
  let grandTotal = 0;
  let grandAttended = 0;

  // Calculate per-subject statistics
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
      // Guard: if target is 0, any attendance is "safe" — avoid division by zero
      const safeTarget = Math.max(target, 0.01);
      const maxTotalAllowed = attended / (safeTarget / 100);
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
    overall: {
      attended: grandAttended,
      total: grandTotal,
      percentage: overallPct
    },
    subjectStats: finalStats
  };
}
