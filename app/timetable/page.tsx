'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Clock, Coffee, Trophy, Library, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

// CONSTANTS
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Subject = { id: string; name: string; color_hex: string };
type Slot = { 
  id: string; 
  day_of_week: number; 
  start_time: string; // Always stored as "14:00"
  end_time: string;
  slot_type: 'SUBJECT' | 'BREAK' | 'SPORTS' | 'LIBRARY' | 'EXAM';
  subject_id?: string;
  subject_name?: string;
  color?: string;
};

export default function TimetablePage() {
  const router = useRouter();
  
  // STATE
  const [activeDay, setActiveDay] = useState(1); // 1 = Monday
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [is24Hour, setIs24Hour] = useState(false); // Default to 12-hour
  
  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  
  // We keep the "Source of Truth" as 24h strings (e.g., "14:00")
  // The UI will convert this back and forth for the user.
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('10:00');
  
  const [selectedType, setSelectedType] = useState('SUBJECT');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: subData, error: subError } = await supabase
        .from('subjects')
        .select('id, name, color_hex')
        .eq('user_id', user.id);

      if (subError) {
        console.error('Error fetching subjects:', subError);
      } else if (subData) {
        setSubjects(subData);
      }

      const { data: slotData, error: slotError } = await supabase
        .from('timetable_slots')
        .select(`
          id, day_of_week, start_time, end_time, slot_type, subject_id,
          subjects (name, color_hex)
        `)
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (slotError) {
        console.error('Error fetching timetable slots:', slotError);
      } else if (slotData) {
        const formattedSlots = slotData.map((s) => {
          // Safe time string parsing
          const startTime = s.start_time && typeof s.start_time === 'string'
            ? s.start_time.length >= 5 ? s.start_time.slice(0, 5) : s.start_time
            : '09:00';
          const endTime = s.end_time && typeof s.end_time === 'string'
            ? s.end_time.length >= 5 ? s.end_time.slice(0, 5) : s.end_time
            : '10:00';

          const subjectData = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;

          return {
            id: s.id,
            day_of_week: s.day_of_week,
            start_time: startTime,
            end_time: endTime,
            slot_type: s.slot_type as Slot['slot_type'],
            subject_id: s.subject_id,
            subject_name: subjectData?.name,
            color: subjectData?.color_hex
          };
        });
        setSlots(formattedSlots);
      }
    } catch (error) {
      console.error('Unexpected error fetching data:', error);
    }
  }, [router]);

  // 1. LOAD DATA & PREFERENCES
  useEffect(() => {
    // SSR-safe localStorage access
    if (typeof window !== 'undefined') {
      const savedFormat = localStorage.getItem('time_format_preference');
      if (savedFormat === '24') setIs24Hour(true);
    }
    fetchData();
  }, [fetchData]);

  // --- TIME HELPERS ---

  // Display "14:00" as "2:00 PM"
  const formatTimeDisplay = (timeStr: string) => {
    if (is24Hour) return timeStr;
    if (!timeStr || typeof timeStr !== 'string') return '--:--';
    const [h, m] = timeStr.split(':');
    if (!h || !m) return timeStr;
    const hour = parseInt(h, 10);
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const toggleFormat = () => {
    const newPref = !is24Hour;
    setIs24Hour(newPref);
    if (typeof window !== 'undefined') {
      localStorage.setItem('time_format_preference', newPref ? '24' : '12');
    }
  };

  // Convert "02:30" + "PM" -> "14:30"
  const convert12to24 = (hour12: number, minute: string, ampm: string) => {
    let hour = hour12;
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const hStr = hour < 10 ? `0${hour}` : `${hour}`;
    return `${hStr}:${minute}`;
  };

  // Convert "14:30" -> { hour: 2, minute: "30", ampm: "PM" }
  const parse24to12 = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string') {
      return { hour: 9, minute: '00', ampm: 'AM' as const };
    }
    const [h, m] = timeStr.split(':');
    if (!h || !m) {
      return { hour: 9, minute: '00', ampm: 'AM' as const };
    }
    const hour = parseInt(h, 10);
    if (isNaN(hour)) {
      return { hour: 9, minute: '00', ampm: 'AM' as const };
    }
    const ampm = hour >= 12 ? 'PM' as const : 'AM' as const;
    const displayHour = hour % 12 || 12;
    return { hour: displayHour, minute: m, ampm };
  };

  // Open modal for adding
  const openAddModal = () => {
    setEditingSlotId(null);
    setNewSlotStart('09:00');
    setNewSlotEnd('10:00');
    setSelectedType('SUBJECT');
    setSelectedSubjectId('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const openEditModal = (slot: Slot) => {
    setEditingSlotId(slot.id);
    setNewSlotStart(slot.start_time);
    setNewSlotEnd(slot.end_time);
    setSelectedType(slot.slot_type);
    setSelectedSubjectId(slot.subject_id || '');
    setIsModalOpen(true);
  };

  // 2. ADD OR UPDATE SLOT
  const handleSaveSlot = async () => {
    // Validation
    if (!newSlotStart || !newSlotEnd) {
      alert('Please select both start and end times');
      return;
    }

    // Validate time order
    if (newSlotStart >= newSlotEnd) {
      alert('End time must be after start time');
      return;
    }

    if (selectedType === 'SUBJECT' && !selectedSubjectId) {
      alert('Please pick a subject!');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      if (editingSlotId) {
        // UPDATE existing slot
        const { error } = await supabase
          .from('timetable_slots')
          .update({
            start_time: newSlotStart,
            end_time: newSlotEnd,
            slot_type: selectedType,
            subject_id: selectedType === 'SUBJECT' ? selectedSubjectId : null,
          })
          .eq('id', editingSlotId);

        if (error) {
          throw error;
        }
      } else {
        // INSERT new slot
        const tempId = Math.random().toString(); 
        const subject = subjects.find(s => s.id === selectedSubjectId);
        
        const newSlot: Slot = {
          id: tempId,
          day_of_week: activeDay,
          start_time: newSlotStart,
          end_time: newSlotEnd,
          slot_type: selectedType as Slot['slot_type'],
          subject_id: selectedSubjectId,
          subject_name: subject?.name,
          color: subject?.color_hex
        };

        setSlots(prev => [...prev, newSlot].sort((a, b) => a.start_time.localeCompare(b.start_time)));

        const { data, error } = await supabase.from('timetable_slots').insert({
          user_id: user.id,
          day_of_week: activeDay,
          start_time: newSlotStart,
          end_time: newSlotEnd,
          slot_type: selectedType,
          subject_id: selectedType === 'SUBJECT' ? selectedSubjectId : null,
        }).select();

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          setSlots(prev => prev.map(s => s.id === tempId ? { ...s, id: data[0].id } : s));
        }
      }

      setIsModalOpen(false);
      fetchData(); // Refresh to get updated data
    } catch (error) {
      console.error('Error saving slot:', error);
      alert('Failed to save class. Please try again.');
      // Revert optimistic update
      fetchData();
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    const originalSlots = [...slots];
    setSlots(prev => prev.filter(s => s.id !== id));

    try {
      const { error } = await supabase.from('timetable_slots').delete().eq('id', id);
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      alert('Failed to delete class. Please try again.');
      // Revert optimistic update
      setSlots(originalSlots);
    }
  };

  // --- COMPONENT: 12H TIME PICKER ---
  // This helps us keep the JSX clean
  const TimePicker12H = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const { hour, minute, ampm } = parse24to12(value);
    
    const update = (h: number, m: string, ap: string) => {
      onChange(convert12to24(h, m, ap));
    };

    return (
      <div className="flex gap-1 items-center">
        {/* Hour */}
        <select 
          value={hour} 
          onChange={(e) => update(parseInt(e.target.value), minute, ampm)}
          className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="font-bold">:</span>
        {/* Minute */}
        <select 
          value={minute} 
          onChange={(e) => update(hour, e.target.value, ampm)}
          className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {/* AM/PM */}
        <button 
          type="button"
          onClick={() => update(hour, minute, ampm === 'AM' ? 'PM' : 'AM')}
          className={`ml-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${ampm === 'AM' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}
        >
          {ampm}
        </button>
      </div>
    );
  };

  const daySlots = slots.filter(s => s.day_of_week === activeDay);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">Timetable</h1>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={toggleFormat}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
              aria-label={`Switch to ${is24Hour ? '12-hour' : '24-hour'} time format`}
            >
              {is24Hour ? '24H' : '12H'}
            </button>

            <button 
              onClick={openAddModal}
              className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              aria-label="Add new class"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Add Class</span>
            </button>
          </div>
        </div>

        {/* DAY TABS */}
        <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {DAYS.map((day, index) => {
            const dayNum = index + 1;
            const isActive = activeDay === dayNum;
            const hasClasses = slots.some(s => s.day_of_week === dayNum);
            
            return (
              <button
                key={day}
                onClick={() => setActiveDay(dayNum)}
                className={clsx(
                  "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
                  isActive 
                    ? "bg-blue-600 border-blue-600 text-white shadow-md" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                )}
              >
                {day}
                {hasClasses && !isActive && <span className="ml-2 w-1.5 h-1.5 bg-blue-400 rounded-full inline-block mb-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* TIMELINE VIEW */}
      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {daySlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <Clock size={32} />
            </div>
            <p>No classes scheduled for {DAYS[activeDay - 1]}.</p>
            <button onClick={openAddModal} className="text-blue-600 font-bold mt-2 hover:underline">
              Add one now?
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {daySlots.map((slot) => (
              <div key={slot.id} className="group relative flex gap-4">
                {/* Time Column */}
                <div className="flex flex-col items-end min-w-[75px] pt-2">
                  <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                    {formatTimeDisplay(slot.start_time)}
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatTimeDisplay(slot.end_time)}
                  </span>
                </div>

                {/* Timeline Line */}
                <div className="relative flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-slate-300 z-10 mt-2.5 group-hover:bg-blue-500 transition-colors" />
                  <div className="w-0.5 flex-1 bg-slate-200 -mt-2 mb-[-16px]" />
                </div>

                {/* Card */}
                <div 
                  className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow mb-2"
                  style={{ borderLeft: `4px solid ${slot.color || '#94a3b8'}` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      {slot.slot_type === 'SUBJECT' ? (
                        <h3 className="font-bold text-slate-800">{slot.subject_name}</h3>
                      ) : (
                        <h3 className="font-bold text-slate-500 flex items-center gap-2">
                          {slot.slot_type === 'BREAK' && <><Coffee size={16}/> Break</>}
                          {slot.slot_type === 'SPORTS' && <><Trophy size={16}/> Sports</>}
                          {slot.slot_type === 'LIBRARY' && <><Library size={16}/> Library</>}
                        </h3>
                      )}
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide font-semibold">{slot.slot_type}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(slot)}
                        className="text-slate-300 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-colors"
                        aria-label={`Edit ${slot.slot_type === 'SUBJECT' ? slot.subject_name : slot.slot_type} class`}
                        title="Edit Class"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                        aria-label={`Delete ${slot.slot_type === 'SUBJECT' ? slot.subject_name : slot.slot_type} class`}
                        title="Delete Class"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD/EDIT CLASS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {editingSlotId ? 'Edit Class' : `Add to ${DAYS[activeDay - 1]}`}
            </h2>

            {/* 1. TIME INPUTS (Conditional Render) */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase">Start Time</label>
                {is24Hour ? (
                  <input 
                    type="time" 
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                    className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <TimePicker12H value={newSlotStart} onChange={setNewSlotStart} />
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase">End Time</label>
                {is24Hour ? (
                  <input 
                    type="time" 
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                    className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <TimePicker12H value={newSlotEnd} onChange={setNewSlotEnd} />
                )}
              </div>
            </div>

            {/* 2. TYPE SELECTOR */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {['SUBJECT', 'BREAK', 'LIBRARY', 'SPORTS'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={clsx(
                    "py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                    selectedType === type 
                      ? "bg-slate-800 text-white" 
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* 3. SUBJECT PICKER */}
            {selectedType === 'SUBJECT' && (
              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Subject</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {subjects.map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={clsx(
                        "p-3 rounded-xl text-sm font-bold text-left transition-all border-2",
                        selectedSubjectId === sub.id 
                          ? "border-blue-500 bg-blue-50 text-blue-700" 
                          : "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: sub.color_hex}}/>
                        {sub.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveSlot}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200"
              >
                {editingSlotId ? 'Update Class' : 'Save Class'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
