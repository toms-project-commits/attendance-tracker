'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, Ban, Calendar, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format, getDay, parseISO } from 'date-fns';
import { clsx } from 'clsx';

type ClassItem = {
  timetable_id?: string;
  subject_id: string;
  subject_name: string;
  color: string;
  start_time: string;
  end_time: string;
  status: 'PRESENT' | 'ABSENT' | 'CANCELLED' | null;
};

export default function MarkAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // ✅ KEY FIX: Initialize date using date-fns to ensure it matches Analytics format exactly
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // 1. Fetch Schedule whenever the date changes
  useEffect(() => {
    fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

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
          
          return {
            timetable_id: slot.id,
            subject_id: slot.subject_id,
            subject_name: slot.subjects?.name || 'Unknown Subject',
            color: slot.subjects?.color_hex || '#94a3b8',
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
      <div className="bg-white p-4 sticky top-0 z-10 border-b border-slate-200 shadow-sm flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">Mark Attendance</h1>
          <p className="text-xs text-slate-400">Select status & confirm below</p>
        </div>
        
        {/* Date Picker */}
        <div className="relative">
             <input 
               type="date" 
               value={date}
               onChange={(e) => setDate(e.target.value)}
               className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
             />
             <button className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors">
               <Calendar size={14} /> {format(parseISO(date), 'MMM d')}
             </button>
        </div>
      </div>

      {/* CLASS LIST */}
      <div className="max-w-xl mx-auto p-4 space-y-4">
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

      {/* FLOATING SAVE BUTTON */}
      {classes.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20">
          <button
            onClick={handleSave}
            disabled={saving}
            className="max-w-xl w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
               <>Saving <Loader2 className="animate-spin" size={18} /></> 
            ) : (
               <>Confirm & Save <Save size={18} /></>
            )}
          </button>
        </div>
      )}

    </div>
  );
}