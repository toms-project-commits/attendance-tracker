'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, Ban, Calendar, Save, Loader2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, getDay, parseISO, addDays, subDays, startOfDay, isSameDay, isBefore } from 'date-fns';
import { clsx } from 'clsx';

type ClassItem = {
  id?: string;
  timetable_id?: string;
  subject_id: string;
  subject_name: string;
  color: string;
  start_time: string;
  end_time: string;
  status: 'PRESENT' | 'ABSENT' | 'CANCELLED' | null;
  is_extra?: boolean;
};

type Subject = {
  id: string;
  name: string;
  color_hex: string;
};

export default function MarkAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAddExtraModal, setShowAddExtraModal] = useState(false);

  // Extra class form state
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [extraStartTime, setExtraStartTime] = useState('09:00');
  const [extraEndTime, setExtraEndTime] = useState('10:00');

  // Quick date navigation
  const navigateDate = useCallback((direction: 'prev' | 'next' | 'today') => {
    const currentDate = parseISO(date);
    let newDate: Date;

    switch (direction) {
      case 'prev':
        newDate = subDays(currentDate, 1);
        break;
      case 'next':
        newDate = addDays(currentDate, 1);
        break;
      case 'today':
        newDate = new Date();
        break;
      default:
        return;
    }

    setDate(format(newDate, 'yyyy-MM-dd'));
  }, [date]);

  useEffect(() => {
    fetchSchedule();
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const fetchSubjects = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subjectsData, error } = await supabase
        .from('subjects')
        .select('id, name, color_hex')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching subjects:', error);
      } else {
        setSubjects(subjectsData || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching subjects:', error);
    }
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const jsDay = getDay(parseISO(date));
      const dbDay = jsDay === 0 ? 7 : jsDay;

      const { data: timetable, error: timetableError } = await supabase
        .from('timetable_slots')
        .select(`
          id, subject_id, start_time, end_time, slot_type,
          subjects (name, color_hex)
        `)
        .eq('user_id', user.id)
        .eq('day_of_week', dbDay)
        .eq('slot_type', 'SUBJECT')
        .order('start_time', { ascending: true });

      if (timetableError) {
        console.error('Error fetching timetable:', timetableError);
      }

      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('subject_id, status, timetable_slot_id, start_time, end_time')
        .eq('user_id', user.id)
        .eq('date', date);

      if (logsError) {
        console.error('Error fetching logs:', logsError);
      }

      const merged: ClassItem[] = [];
      
      // Add timetable classes
      if (timetable) {
        timetable.forEach((slot) => {
          // Match log by timetable_slot_id for accuracy (handles multiple same subjects)
          const existingLog = logs?.find(l => l.timetable_slot_id === slot.id);

          const startTime = slot.start_time && typeof slot.start_time === 'string'
            ? slot.start_time.length >= 5 ? slot.start_time.slice(0, 5) : slot.start_time
            : '09:00';
          const endTime = slot.end_time && typeof slot.end_time === 'string'
            ? slot.end_time.length >= 5 ? slot.end_time.slice(0, 5) : slot.end_time
            : '10:00';

          const subjectData = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects;

          merged.push({
            timetable_id: slot.id,
            subject_id: slot.subject_id,
            subject_name: subjectData?.name || 'Unknown Subject',
            color: subjectData?.color_hex || '#94a3b8',
            start_time: startTime,
            end_time: endTime,
            status: (existingLog?.status as ClassItem['status']) || null
          });
        });
      }

      // Add extra classes (those without timetable_slot_id)
      const extraLogs = logs?.filter(log => !log.timetable_slot_id && log.start_time) || [];
      for (const extraLog of extraLogs) {
        const subject = subjects.find(s => s.id === extraLog.subject_id);
        if (subject) {
          const startTime = extraLog.start_time && typeof extraLog.start_time === 'string'
            ? extraLog.start_time.length >= 5 ? extraLog.start_time.slice(0, 5) : extraLog.start_time
            : '09:00';
          const endTime = extraLog.end_time && typeof extraLog.end_time === 'string'
            ? extraLog.end_time.length >= 5 ? extraLog.end_time.slice(0, 5) : extraLog.end_time
            : '10:00';

          merged.push({
            id: `extra_${extraLog.subject_id}_${extraLog.start_time}`,
            subject_id: extraLog.subject_id,
            subject_name: subject.name,
            color: subject.color_hex,
            start_time: startTime,
            end_time: endTime,
            status: (extraLog?.status as ClassItem['status']) || null,
            is_extra: true
          });
        }
      }

      // Sort by start time
      merged.sort((a, b) => {
        const timeA = a.start_time || '00:00';
        const timeB = b.start_time || '00:00';
        return timeA.localeCompare(timeB);
      });

      setClasses(merged);
    } catch (error) {
      console.error('Unexpected error fetching schedule:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetStatus = (index: number, status: ClassItem['status']) => {
    const updated = [...classes];
    if (updated[index].status === status) {
      updated[index].status = null;
    } else {
      updated[index].status = status;
    }
    setClasses(updated);
  };

  const handleMarkAll = (status: ClassItem['status']) => {
    const updated = classes.map(cls => ({
      ...cls,
      status: status
    }));
    setClasses(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Delete existing attendance for this date
      await supabase
        .from('attendance_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('date', date);

      const logsToInsert = classes
        .filter(c => c.status !== null)
        .map(c => ({
          user_id: user.id,
          subject_id: c.subject_id,
          date: date,
          status: c.status,
          // For timetable classes, store timetable_slot_id
          timetable_slot_id: c.is_extra ? null : c.timetable_id,
          // For extra classes, store times
          start_time: c.is_extra ? c.start_time : null,
          end_time: c.is_extra ? c.end_time : null
        }));

      if (logsToInsert.length > 0) {
        const { error } = await supabase.from('attendance_logs').insert(logsToInsert);
        if (error) {
          console.error('Save error:', error);
          throw error;
        }
      }
      
      // Add cache-busting timestamp to force data refresh
      router.push('/dashboard?refresh=' + Date.now());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      alert("Error saving attendance: " + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const addExtraClass = useCallback(() => {
    if (!selectedSubjectId) {
      alert('Please select a subject');
      return;
    }

    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    if (!selectedSubject) return;

    const newExtraClass: ClassItem = {
      id: `extra_${Date.now()}`,
      subject_id: selectedSubjectId,
      subject_name: selectedSubject.name,
      color: selectedSubject.color_hex,
      start_time: extraStartTime,
      end_time: extraEndTime,
      status: null,
      is_extra: true
    };

    setClasses(prev => [...prev, newExtraClass]);
    setShowAddExtraModal(false);
    setSelectedSubjectId('');
    setExtraStartTime('09:00');
    setExtraEndTime('10:00');
  }, [selectedSubjectId, subjects, extraStartTime, extraEndTime]);

  const formatTime = (time: string) => {
    if (!time || typeof time !== 'string') return '--:--';
    const [h, m] = time.split(':');
    if (!h || !m) return time;
    const hour = parseInt(h, 10);
    if (isNaN(hour)) return time;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const isToday = isSameDay(parseISO(date), startOfDay(new Date()));
  const isPast = isBefore(parseISO(date), startOfDay(new Date())) && !isToday;

  return (
    <div className="min-h-screen pb-48" style={{ background: 'var(--background)' }}>
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white p-4 sticky top-0 z-40 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
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
                 Mark Attendance
              </h1>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Select status for each class
              </p>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Navigation Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => navigateDate('prev')}
                className={clsx(
                  "p-2 border-[3px] border-black bg-white",
                  "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:bg-slate-700 dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                )}
                aria-label="Previous day"
              >
                <ChevronLeft size={18} className="text-black dark:text-white" />
              </button>

              <button
                onClick={() => navigateDate('today')}
                className={clsx(
                  "px-4 py-2 border-[3px] border-black font-black text-sm",
                  "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                  "transition-all duration-150",
                  isToday 
                    ? "bg-blue-500 text-white" 
                    : "bg-white text-black dark:bg-slate-700 dark:text-white",
                  "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                TODAY
              </button>

              <button
                onClick={() => navigateDate('next')}
                className={clsx(
                  "p-2 border-[3px] border-black bg-white",
                  "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:bg-slate-700 dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                )}
                aria-label="Next day"
              >
                <ChevronRight size={18} className="text-black dark:text-white" />
              </button>
            </div>

            {/* Date Picker Display */}
            <div className="relative flex-1 min-w-[160px]">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                aria-label="Select date for attendance"
              />
              <div 
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 border-[3px] border-black font-bold text-sm",
                  "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                  "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                  isToday 
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                    : isPast
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300"
                      : "bg-white text-black dark:bg-slate-700 dark:text-white"
                )}
              >
                <Calendar size={16} />
                <span>{format(parseISO(date), 'EEE, MMM d, yyyy')}</span>
                {isToday && <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-black">TODAY</span>}
                {isPast && <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-black">PAST</span>}
              </div>
            </div>

            {/* Add Extra Class Button */}
            <button
              onClick={() => setShowAddExtraModal(true)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 border-[3px] border-black bg-green-500 text-white font-black text-sm",
                "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                "transition-all duration-150",
                "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              <Plus size={16} /> EXTRA
            </button>
          </div>
        </div>
      </div>

      {/* CLASS LIST */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Info Banner for Past Dates */}
        {isPast && classes.length > 0 && (
          <div className="border-[3px] border-black bg-orange-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
            <p className="font-black text-black">📝 Editing past attendance</p>
            <p className="text-sm font-semibold text-black/80 mt-1">
              Changes will be reflected in your analytics.
            </p>
          </div>
        )}

        {/* Bulk Action Buttons */}
        {!loading && classes.length > 0 && (
          <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <p className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3">
              ⚡ Quick Actions
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleMarkAll('PRESENT')}
                className={clsx(
                  "py-3 flex flex-col items-center justify-center gap-1 transition-all duration-150",
                  "border-[3px] border-black bg-green-500 text-white font-black text-sm",
                  "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                  "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                  "dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                <Check size={20} />
                <span>ALL PRESENT</span>
              </button>

              <button
                onClick={() => handleMarkAll('ABSENT')}
                className={clsx(
                  "py-3 flex flex-col items-center justify-center gap-1 transition-all duration-150",
                  "border-[3px] border-black bg-red-500 text-white font-black text-sm",
                  "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                  "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                  "dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                <X size={20} />
                <span>ALL ABSENT</span>
              </button>

              <button
                onClick={() => handleMarkAll('CANCELLED')}
                className={clsx(
                  "py-3 flex flex-col items-center justify-center gap-1 transition-all duration-150",
                  "border-[3px] border-black bg-gray-600 text-white font-black text-sm",
                  "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                  "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]",
                  "dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                <Ban size={20} />
                <span>ALL CANCELLED</span>
              </button>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="border-[3px] border-black bg-yellow-400 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
              <Loader2 className="animate-spin mx-auto mb-2 text-black" size={32} />
              <p className="font-bold text-black">Loading schedule...</p>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <div className="border-[3px] border-black border-dashed bg-white p-8 text-center dark:bg-slate-800 dark:border-white">
            <div className="w-16 h-16 bg-green-500 border-[3px] border-black dark:border-white mx-auto mb-4 flex items-center justify-center">
              <Check className="text-white" size={32} />
            </div>
            <p className="text-xl font-black text-black dark:text-white">No classes scheduled!</p>
            <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-2">
              Enjoy your free time! 
            </p>
          </div>
        ) : (
          classes.map((cls, idx) => (
            <div 
              key={idx} 
              className={clsx(
                "border-[3px] border-black bg-white p-5",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              {/* Class Info */}
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-3 h-14 border-[2px] border-black dark:border-white" 
                  style={{ backgroundColor: cls.color }} 
                />
                <div className="flex-1">
                  <h3 className="font-black text-lg text-black dark:text-white">{cls.subject_name}</h3>
                  <div className="text-sm font-bold text-gray-600 dark:text-gray-400">
                    🕐 {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                  </div>
                </div>
                {cls.is_extra && (
                  <span className="px-2 py-1 text-xs font-black bg-purple-500 text-white border-[2px] border-black dark:border-white">
                    EXTRA
                  </span>
                )}
              </div>

              {/* ACTION BUTTONS - Neo-Brutalist Style */}
              <div className="grid grid-cols-3 gap-3">
                {/* PRESENT Button */}
                <button
                  onClick={() => handleSetStatus(idx, 'PRESENT')}
                  className={clsx(
                    "py-4 flex flex-col items-center justify-center gap-1 transition-all duration-150",
                    "border-[3px] border-black font-black",
                    cls.status === 'PRESENT'
                      ? "bg-green-500 text-white shadow-none translate-x-[2px] translate-y-[2px]"
                      : "bg-green-100 text-green-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    "dark:border-white",
                    cls.status === 'PRESENT' 
                      ? "dark:shadow-none"
                      : "dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  aria-label={`Mark ${cls.subject_name} as present`}
                  aria-pressed={cls.status === 'PRESENT'}
                >
                  <Check size={24} /> 
                  <span className="text-xs">PRESENT</span>
                </button>

                {/* ABSENT Button */}
                <button
                  onClick={() => handleSetStatus(idx, 'ABSENT')}
                  className={clsx(
                    "py-4 flex flex-col items-center justify-center gap-1 transition-all duration-150",
                    "border-[3px] border-black font-black",
                    cls.status === 'ABSENT'
                      ? "bg-red-500 text-white shadow-none translate-x-[2px] translate-y-[2px]"
                      : "bg-red-100 text-red-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    "dark:border-white",
                    cls.status === 'ABSENT' 
                      ? "dark:shadow-none"
                      : "dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  aria-label={`Mark ${cls.subject_name} as absent`}
                  aria-pressed={cls.status === 'ABSENT'}
                >
                  <X size={24} /> 
                  <span className="text-xs">ABSENT</span>
                </button>

                {/* CANCELLED Button */}
                <button
                  onClick={() => handleSetStatus(idx, 'CANCELLED')}
                  className={clsx(
                    "py-4 flex flex-col items-center justify-center gap-1 transition-all duration-150",
                    "border-[3px] border-black font-black",
                    cls.status === 'CANCELLED'
                      ? "bg-gray-600 text-white shadow-none translate-x-[2px] translate-y-[2px]"
                      : "bg-gray-200 text-gray-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                    "dark:border-white",
                    cls.status === 'CANCELLED' 
                      ? "dark:shadow-none"
                      : "dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  aria-label={`Mark ${cls.subject_name} as cancelled`}
                  aria-pressed={cls.status === 'CANCELLED'}
                >
                  <Ban size={24} /> 
                  <span className="text-xs">CANCELLED</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD EXTRA CLASS MODAL */}
      {showAddExtraModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="border-[3px] border-black bg-white p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <h3 className="text-xl font-black text-black dark:text-white mb-6">➕ Add Extra Class</h3>

            <div className="space-y-4">
              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-2">
                  Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className={clsx(
                    "w-full p-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={extraStartTime}
                  onChange={(e) => setExtraStartTime(e.target.value)}
                  className={clsx(
                    "w-full p-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={extraEndTime}
                  onChange={(e) => setExtraEndTime(e.target.value)}
                  className={clsx(
                    "w-full p-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddExtraModal(false)}
                className={clsx(
                  "flex-1 py-3 px-4 font-black text-base",
                  "border-[3px] border-black bg-gray-200 text-black",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:bg-slate-600 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                Cancel
              </button>
              <button
                onClick={addExtraClass}
                className={clsx(
                  "flex-1 py-3 px-4 font-black text-base text-white",
                  "border-[3px] border-black bg-green-500",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                Add Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SAVE SECTION */}
      {classes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent pt-8">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Summary Box */}
            <div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-2">
                  <div className="text-2xl font-black text-green-600">{classes.filter(c => c.status === 'PRESENT').length}</div>
                  <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Present</div>
                </div>
                <div className="p-2 border-x-[2px] border-black dark:border-white">
                  <div className="text-2xl font-black text-red-600">{classes.filter(c => c.status === 'ABSENT').length}</div>
                  <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Absent</div>
                </div>
                <div className="p-2">
                  <div className="text-2xl font-black text-gray-600">{classes.filter(c => c.status === 'CANCELLED').length}</div>
                  <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Cancelled</div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                "w-full py-4 font-black text-lg text-white flex items-center justify-center gap-3",
                "border-[3px] border-black bg-blue-500",
                "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[6px] active:translate-y-[6px] active:shadow-none",
                "transition-all duration-150",
                "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
                "dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
                "dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              {saving ? (
                <>Saving... <Loader2 className="animate-spin" size={20} /></>
              ) : (
                <> CONFIRM & SAVE <Save size={20} /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
