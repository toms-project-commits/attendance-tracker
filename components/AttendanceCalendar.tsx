'use client';

import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSunday, parseISO, isSameDay
} from 'date-fns';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  logs: Array<{ date: string; status: string }>;
  holidays: Array<{ date: string }>;
  saturdayOffs: number[];
  semesterStart: string;
  semesterEnd: string;
}

export default function AttendanceCalendar({
  logs,
  holidays,
  saturdayOffs,
  semesterStart,
  semesterEnd
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const getDayType = (day: Date): 'holiday' | 'saturday-off' | 'sunday' | 'working' => {
    const dateStr = format(day, 'yyyy-MM-dd');
    
    if (isSunday(day)) return 'sunday';
    
    const isHoliday = holidays.some((holiday) => holiday.date && holiday.date.substring(0, 10) === dateStr);
    if (isHoliday) return 'holiday';
    
    const dayOfWeekIndex = getDay(day);
    if (dayOfWeekIndex === 6) {
      const monthStart = startOfMonth(day);
      let firstSaturday: Date | null = null;
      for (let i = 0; i < 7; i++) {
        const candidate = new Date(monthStart);
        candidate.setDate(monthStart.getDate() + i);
        if (getDay(candidate) === 6) {
          firstSaturday = candidate;
          break;
        }
      }
      
      if (firstSaturday) {
        const daysDiff = Math.floor((day.getTime() - firstSaturday.getTime()) / (1000 * 60 * 60 * 24));
        const weekNum = Math.floor(daysDiff / 7) + 1;
        if (weekNum >= 1 && weekNum <= 5 && saturdayOffs.includes(weekNum)) {
          return 'saturday-off';
        }
      }
    }
    
    return 'working';
  };

  const getAttendanceStatus = (day: Date): 'present' | 'absent' | 'unmarked' | 'none' => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayType = getDayType(day);
    
    if (dayType !== 'working') return 'none';
    
    const inSemester = dateStr >= format(parseISO(semesterStart), 'yyyy-MM-dd') && 
                      dateStr <= format(parseISO(semesterEnd), 'yyyy-MM-dd');
    if (!inSemester) return 'none';
    
    const log = logs.find((l) => l.date && l.date.substring(0, 10) === dateStr);
    if (!log) return 'unmarked';
    
    if (log.status === 'PRESENT') return 'present';
    if (log.status === 'ABSENT') return 'absent';
    
    return 'unmarked';
  };

  const month = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: month, end: monthEnd });
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek = getDay(month);
  const emptyDays = Array.from({ length: firstDayOfWeek }).map(() => null);
  const calendarDays = [...emptyDays, ...days];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-slate-600">Present</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-slate-600">Absent</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-slate-600">Unmarked</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-slate-300"></div>
          <span className="text-slate-600">Holiday</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-slate-200"></div>
          <span className="text-slate-600">Off</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const attendance = getAttendanceStatus(day);
          const dayType = getDayType(day);
          const isToday = isSameDay(day, new Date());

          let bgColor = 'bg-slate-50';
          let borderColor = 'border-slate-100';
          let textColor = 'text-slate-400';

          if (dayType === 'holiday') {
            bgColor = 'bg-slate-100';
            textColor = 'text-slate-400';
          } else if (dayType === 'saturday-off') {
            bgColor = 'bg-slate-50';
            textColor = 'text-slate-300';
          } else if (dayType === 'sunday') {
            bgColor = 'bg-slate-50';
            textColor = 'text-slate-300';
          } else if (attendance === 'present') {
            bgColor = 'bg-green-100';
            borderColor = 'border-green-300';
            textColor = 'text-green-700 font-bold';
          } else if (attendance === 'absent') {
            bgColor = 'bg-red-100';
            borderColor = 'border-red-300';
            textColor = 'text-red-700 font-bold';
          } else if (attendance === 'unmarked') {
            bgColor = 'bg-yellow-50';
            borderColor = 'border-yellow-200';
            textColor = 'text-slate-600';
          }

          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={clsx(
                'aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all',
                bgColor,
                borderColor,
                'border',
                textColor,
                isToday && 'ring-2 ring-blue-400 ring-offset-1'
              )}
              title={dayType === 'holiday' ? 'Holiday' : dayType === 'saturday-off' ? 'Saturday Off' : dayType === 'sunday' ? 'Sunday' : undefined}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
}
