'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, Ban, Calendar, Save, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { format, getDay, parseISO, addDays, subDays, startOfDay, isSameDay, isBefore } from 'date-fns';
import { clsx } from 'clsx';

type ClassItem = {
  id?: string; // For extra classes
  timetable_id?: string;
  subject_id: string;
  subject_name: string;
  color: string;
  start_time: string;
  end_time: string;
  status: 'PRESENT' | 'ABSENT' | 'CANCELLED' | null;
  is_extra?: boolean; // Flag for extra classes
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

  // ✅ KEY FIX: Initialize date using date-fns to ensure it matches Analytics format exactly
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

  // 1. Fetch Schedule whenever the date changes
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

      // A. Calculate DB Day (1=Mon ... 7=Sun) based on selected date
      const jsDay = getDay(parseISO(date)); // returns 0 for Sunday
      const dbDay = jsDay === 0 ? 7 : jsDay;

      // B. Fetch Timetable for this day
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

      // C. Fetch Existing Logs (Strict string match on date)
      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('subject_id, status')
        .eq('user_id', user.id)
        .eq('date', date);

      if (logsError) {
        console.error('Error fetching logs:', logsError);
      }

      if (timetable) {
        // Merge Timetable + Logs
        const merged: ClassItem[] = timetable.map((slot) => {
          const existingLog = logs?.find(l => l.subject_id === slot.subject_id);

          // Safe time string parsing
          const startTime = slot.start_time && typeof slot.start_time === 'string'
            ? slot.start_time.length >= 5 ? slot.start_time.slice(0, 5) : slot.start_time
            : '09:00';
          const endTime = slot.end_time && typeof slot.end_time === 'string'
            ? slot.end_time.length >= 5 ? slot.end_time.slice(0, 5) : slot.end_time
            : '10:00';

          const subjectData = Array.isArray(slot.subjects) ? slot.subjects[0] : slot.subjects;

          return {
            timetable_id: slot.id,
            subject_id: slot.subject_id,
            subject_name: subjectData?.name || 'Unknown Subject',
            color: subjectData?.color_hex || '#94a3b8',
            start_time: startTime,
            end_time: endTime,
            status: (existingLog?.status as ClassItem['status']) || null
          };
        });
        setClasses(merged);
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('Unexpected error fetching schedule:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle button clicks (Local state only)
  const handleSetStatus = (index: number, status: ClassItem['status']) => {
    const updated = [...classes];
    // If clicking the already selected status, unselect it (toggle off)
    if (updated[index].status === status) {
      updated[index].status = null;
    } else {
      updated[index].status = status;
    }
    setClasses(updated);
  };

  // 3. Save to Database
  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Step A: Delete all existing logs for this specific user & date
      // This handles "Unmarking" and prevents duplicates.
      await supabase
        .from('attendance_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('date', date);

      // Step B: Prepare new logs (only for items that have a status)
      const logsToInsert = classes
        .filter(c => c.status !== null)
        .map(c => ({
          user_id: user.id,
          subject_id: c.subject_id,
          date: date,
          status: c.status
        }));

      // Step C: Insert
      if (logsToInsert.length > 0) {
        const { error } = await supabase.from('attendance_logs').insert(logsToInsert);
        if (error) throw error;
      }
      
      router.push('/dashboard');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      alert("Error saving attendance: " + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Add extra class functionality
  const addExtraClass = useCallback(() => {
    if (!selectedSubjectId) {
      alert('Please select a subject');
      return;
    }

    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    if (!selectedSubject) return;

    const newExtraClass: ClassItem = {
      id: `extra_${Date.now()}`, // Temporary ID for UI
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



  // Helper: Format "14:00" to "2:00 PM"
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

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      
      {/* HEADER */}
      <div className="bg-white p-4 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3">
          <div className="flex items-center gap-4 flex-1">
            <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-slate-800">Mark Attendance</h1>
              <p className="text-xs text-slate-400">Select status & confirm below • Edit past dates anytime</p>
            </div>
          </div>

          {/* Quick Date Navigation & Date Picker */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Quick Date Navigation */}
            <div className="flex gap-1">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
                aria-label="Previous day"
              >
                ←
              </button>

              <button
                onClick={() => navigateDate('today')}
                className="px-3 py-2 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Today
              </button>

              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
                aria-label="Next day"
              >
                →
              </button>
            </div>

            {/* Date Picker */}
            <div className="relative w-[140px] sm:w-auto sm:min-w-[140px]">
                 <input
                   type="date"
                   value={date}
                   onChange={(e) => setDate(e.target.value)}
                   className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                   aria-label="Select date for attendance"
                 />
                 <div className={clsx("flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl text-xs font-bold border transition-colors",
                   isSameDay(parseISO(date), startOfDay(new Date()))
                     ? "bg-blue-100 text-blue-700 border-blue-300"
                     : isBefore(parseISO(date), startOfDay(new Date()))
                       ? "bg-orange-50 text-orange-700 border-orange-200"
                       : "bg-slate-100 text-slate-600 border-slate-200"
                 )}>
                   <Calendar size={14} />
                   <span className="hidden sm:inline">{format(parseISO(date), 'MMM d, yyyy')}</span>
                   <span className="sm:hidden">{format(parseISO(date), 'MMM d')}</span>
                   {isSameDay(parseISO(date), startOfDay(new Date())) && <span className="ml-1">•</span>}
                   {isBefore(parseISO(date), startOfDay(new Date())) && date !== format(new Date(), 'yyyy-MM-dd') && <span className="ml-1 hidden sm:inline">• Past</span>}
                 </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddExtraModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Extra Class
          </button>
        </div>
      </div>

      {/* CLASS LIST */}
      <div className="max-w-xl mx-auto p-4 space-y-4">
        {/* Info Banner for Past Dates */}
        {isBefore(parseISO(date), startOfDay(new Date())) && classes.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-sm text-orange-700">
            <p className="font-medium">📝 Editing past attendance</p>
            <p className="text-xs mt-1">You can update attendance records for past dates. Changes will be reflected in analytics.</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <Loader2 className="animate-spin mb-2" />
             <p>Loading schedule...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="bg-slate-200 p-4 rounded-full mb-3">
              <Check size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-bold">No classes scheduled.</p>
            <p className="text-xs text-slate-400 mt-1">Enjoy your free time!</p>
          </div>
        ) : (
          classes.map((cls, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              
              {/* Class Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: cls.color }} />
                <div>
                  <h3 className="font-bold text-slate-800">{cls.subject_name}</h3>
                  <div className="text-xs text-slate-400 font-medium">
                    {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSetStatus(idx, 'PRESENT')}
                  className={clsx(
                    "py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2",
                    cls.status === 'PRESENT'
                      ? "bg-green-50 border-green-500 text-green-700 font-bold shadow-sm"
                      : "bg-white border-slate-100 text-slate-400 hover:border-green-200"
                  )}
                  aria-label={`Mark ${cls.subject_name} as present`}
                  aria-pressed={cls.status === 'PRESENT'}
                >
                  <Check size={20} /> <span className="text-[10px] font-bold">PRESENT</span>
                </button>

                <button
                  onClick={() => handleSetStatus(idx, 'ABSENT')}
                  className={clsx(
                    "py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2",
                    cls.status === 'ABSENT'
                      ? "bg-red-50 border-red-500 text-red-700 font-bold shadow-sm"
                      : "bg-white border-slate-100 text-slate-400 hover:border-red-200"
                  )}
                  aria-label={`Mark ${cls.subject_name} as absent`}
                  aria-pressed={cls.status === 'ABSENT'}
                >
                  <X size={20} /> <span className="text-[10px] font-bold">ABSENT</span>
                </button>

                <button
                  onClick={() => handleSetStatus(idx, 'CANCELLED')}
                  className={clsx(
                    "py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2",
                    cls.status === 'CANCELLED'
                      ? "bg-slate-100 border-slate-500 text-slate-600 font-bold shadow-sm"
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                  )}
                  aria-label={`Mark ${cls.subject_name} as cancelled`}
                  aria-pressed={cls.status === 'CANCELLED'}
                >
                  <Ban size={20} /> <span className="text-[10px] font-bold">CANCELLED</span>
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* ADD EXTRA CLASS MODAL */}
      {showAddExtraModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add Extra Class</h3>

            <div className="space-y-4">
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-slate-600 mb-2">Start Time</label>
                <input
                  type="time"
                  value={extraStartTime}
                  onChange={(e) => setExtraStartTime(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">End Time</label>
                <input
                  type="time"
                  value={extraEndTime}
                  onChange={(e) => setExtraEndTime(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddExtraModal(false)}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addExtraClass}
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
              >
                Add Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SAVE BUTTON WITH SUMMARY */}
      {classes.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 flex justify-center z-20">
          <div className="max-w-xl w-full space-y-3">
            {/* Summary Box */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="text-lg font-bold text-green-600">{classes.filter(c => c.status === 'PRESENT').length}</div>
                  <div className="text-xs text-slate-400">Present</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{classes.filter(c => c.status === 'ABSENT').length}</div>
                  <div className="text-xs text-slate-400">Absent</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-600">{classes.filter(c => c.status === 'CANCELLED').length}</div>
                  <div className="text-xs text-slate-400">Cancelled</div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? (
                 <>Saving <Loader2 className="animate-spin" size={18} /></>
              ) : (
                 <>Confirm & Save <Save size={18} /></>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
