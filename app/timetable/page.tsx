'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Clock, Coffee, Trophy, Library, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

// CONSTANTS
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Subject = { id: string; name: string; color_hex: string };
type Slot = { 
  id: string; 
  day_of_week: number; 
  start_time: string;
  end_time: string;
  slot_type: 'SUBJECT' | 'BREAK' | 'SPORTS' | 'LIBRARY' | 'EXAM';
  subject_id?: string;
  subject_name?: string;
  color?: string;
};

export default function TimetablePage() {
  const router = useRouter();
  
  // STATE
  const [activeDay, setActiveDay] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [is24Hour, setIs24Hour] = useState(false);
  
  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFormat = localStorage.getItem('time_format_preference');
      if (savedFormat === '24') setIs24Hour(true);
    }
    fetchData();
  }, [fetchData]);

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

  const convert12to24 = (hour12: number, minute: string, ampm: string) => {
    let hour = hour12;
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const hStr = hour < 10 ? `0${hour}` : `${hour}`;
    return `${hStr}:${minute}`;
  };

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

  const openAddModal = () => {
    setEditingSlotId(null);
    setNewSlotStart('09:00');
    setNewSlotEnd('10:00');
    setSelectedType('SUBJECT');
    setSelectedSubjectId('');
    setIsModalOpen(true);
  };

  const openEditModal = (slot: Slot) => {
    setEditingSlotId(slot.id);
    setNewSlotStart(slot.start_time);
    setNewSlotEnd(slot.end_time);
    setSelectedType(slot.slot_type);
    setSelectedSubjectId(slot.subject_id || '');
    setIsModalOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!newSlotStart || !newSlotEnd) {
      alert('Please select both start and end times');
      return;
    }

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
      fetchData();
    } catch (error) {
      console.error('Error saving slot:', error);
      alert('Failed to save class. Please try again.');
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
      setSlots(originalSlots);
    }
  };

  // --- COMPONENT: 12H TIME PICKER ---
  const TimePicker12H = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const { hour, minute, ampm } = parse24to12(value);
    
    const update = (h: number, m: string, ap: string) => {
      onChange(convert12to24(h, m, ap));
    };

    return (
      <div className="flex gap-1 items-center">
        <select 
          value={hour} 
          onChange={(e) => update(parseInt(e.target.value), minute, ampm)}
          className={clsx(
            "p-2 text-sm font-bold",
            "border-[3px] border-black bg-white",
            "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
            "focus:outline-none",
            "dark:bg-slate-700 dark:text-white dark:border-white"
          )}
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="font-black text-black dark:text-white">:</span>
        <select 
          value={minute} 
          onChange={(e) => update(hour, e.target.value, ampm)}
          className={clsx(
            "p-2 text-sm font-bold",
            "border-[3px] border-black bg-white",
            "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
            "focus:outline-none",
            "dark:bg-slate-700 dark:text-white dark:border-white"
          )}
        >
          {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button 
          type="button"
          onClick={() => update(hour, minute, ampm === 'AM' ? 'PM' : 'AM')}
          className={clsx(
            "ml-1 px-3 py-2 border-[3px] border-black font-black text-xs",
            "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
            "transition-all duration-150",
            "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            ampm === 'AM' ? 'bg-orange-400 text-black' : 'bg-indigo-500 text-white',
            "dark:border-white"
          )}
        >
          {ampm}
        </button>
      </div>
    );
  };

  const daySlots = slots.filter(s => s.day_of_week === activeDay);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white p-4 sticky top-0 z-40 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
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
              <h1 className="text-xl md:text-2xl font-black text-black dark:text-white">
                📅 Timetable
              </h1>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={toggleFormat}
                className={clsx(
                  "px-3 py-2 border-[3px] border-black font-black text-xs",
                  "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                  "transition-all duration-150",
                  "bg-white text-black",
                  "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                )}
                aria-label={`Switch to ${is24Hour ? '12-hour' : '24-hour'} time format`}
              >
                {is24Hour ? '24H' : '12H'}
              </button>

              <button 
                onClick={openAddModal}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 border-[3px] border-black bg-blue-500 text-white font-black text-sm",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
                aria-label="Add new class"
              >
                <Plus size={18} /> <span className="hidden sm:inline">ADD</span>
              </button>
            </div>
          </div>

          {/* DAY TABS */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {DAYS.map((day, index) => {
              const dayNum = index + 1;
              const isActive = activeDay === dayNum;
              const hasClasses = slots.some(s => s.day_of_week === dayNum);
              
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(dayNum)}
                  className={clsx(
                    "px-4 py-2 border-[3px] border-black font-black text-sm whitespace-nowrap transition-all duration-150",
                    isActive 
                      ? "bg-blue-500 text-white shadow-none translate-x-[2px] translate-y-[2px]" 
                      : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "dark:border-white",
                    isActive 
                      ? "dark:shadow-none"
                      : "dark:bg-slate-700 dark:text-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                  )}
                >
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{SHORT_DAYS[index]}</span>
                  {hasClasses && !isActive && <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TIMELINE VIEW */}
      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {daySlots.length === 0 ? (
          <div className="border-[3px] border-black border-dashed bg-white p-8 text-center dark:bg-slate-800 dark:border-white">
            <div className="w-16 h-16 bg-purple-500 border-[3px] border-black dark:border-white mx-auto mb-4 flex items-center justify-center">
              <Clock size={32} className="text-white" />
            </div>
            <p className="text-xl font-black text-black dark:text-white">No classes on {DAYS[activeDay - 1]}</p>
            <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-2">
              Add a class to get started!
            </p>
            <button 
              onClick={openAddModal} 
              className={clsx(
                "inline-block mt-4 px-6 py-3 border-[3px] border-black bg-blue-500 text-white font-black",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                "transition-all duration-150",
                "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              ➕ Add Class
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {daySlots.map((slot) => (
              <div key={slot.id} className="group relative flex gap-4">
                {/* Time Column */}
                <div className="flex flex-col items-end min-w-[80px] pt-3">
                  <span className="text-sm font-black text-black dark:text-white whitespace-nowrap">
                    {formatTimeDisplay(slot.start_time)}
                  </span>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatTimeDisplay(slot.end_time)}
                  </span>
                </div>

                {/* Timeline Line */}
                <div className="relative flex flex-col items-center">
                  <div 
                    className="w-4 h-4 border-[3px] border-black dark:border-white z-10 mt-3 group-hover:scale-110 transition-transform" 
                    style={{ backgroundColor: slot.color || '#94a3b8' }}
                  />
                  <div className="w-[3px] flex-1 bg-black dark:bg-white -mt-1 mb-[-16px]" />
                </div>

                {/* Card */}
                <div 
                  className={clsx(
                    "flex-1 border-[3px] border-black bg-white p-4",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "transition-all duration-200",
                    "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]",
                    "dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  style={{ borderLeftWidth: '6px', borderLeftColor: slot.color || '#94a3b8' }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      {slot.slot_type === 'SUBJECT' ? (
                        <h3 className="font-black text-lg text-black dark:text-white">{slot.subject_name}</h3>
                      ) : (
                        <h3 className="font-black text-lg text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          {slot.slot_type === 'BREAK' && <><Coffee size={18}/> Break</>}
                          {slot.slot_type === 'SPORTS' && <><Trophy size={18}/> Sports</>}
                          {slot.slot_type === 'LIBRARY' && <><Library size={18}/> Library</>}
                        </h3>
                      )}
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">{slot.slot_type}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(slot)}
                        className={clsx(
                          "p-2 border-[2px] border-black bg-blue-100",
                          "hover:bg-blue-500 hover:text-white",
                          "transition-all duration-150",
                          "dark:border-white dark:bg-blue-900/30 dark:hover:bg-blue-500"
                        )}
                        aria-label={`Edit ${slot.slot_type === 'SUBJECT' ? slot.subject_name : slot.slot_type} class`}
                        title="Edit Class"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSlot(slot.id)}
                        className={clsx(
                          "p-2 border-[2px] border-black bg-red-100",
                          "hover:bg-red-500 hover:text-white",
                          "transition-all duration-150",
                          "dark:border-white dark:bg-red-900/30 dark:hover:bg-red-500"
                        )}
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="border-[3px] border-black bg-white w-full max-w-md p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-xl font-black text-black dark:text-white mb-6">
              {editingSlotId ? '✏️ Edit Class' : `➕ Add to ${DAYS[activeDay - 1]}`}
            </h2>

            {/* TIME INPUTS */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-black text-black dark:text-white uppercase">Start</label>
                {is24Hour ? (
                  <input 
                    type="time" 
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                    className={clsx(
                      "p-2 text-base font-bold",
                      "border-[3px] border-black bg-white",
                      "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                      "focus:outline-none",
                      "dark:bg-slate-700 dark:text-white dark:border-white"
                    )}
                  />
                ) : (
                  <TimePicker12H value={newSlotStart} onChange={setNewSlotStart} />
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-black text-black dark:text-white uppercase">End</label>
                {is24Hour ? (
                  <input 
                    type="time" 
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                    className={clsx(
                      "p-2 text-base font-bold",
                      "border-[3px] border-black bg-white",
                      "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                      "focus:outline-none",
                      "dark:bg-slate-700 dark:text-white dark:border-white"
                    )}
                  />
                ) : (
                  <TimePicker12H value={newSlotEnd} onChange={setNewSlotEnd} />
                )}
              </div>
            </div>

            {/* TYPE SELECTOR */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {['SUBJECT', 'BREAK', 'LIBRARY', 'SPORTS'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={clsx(
                    "py-2 border-[3px] border-black font-black text-[10px] uppercase transition-all duration-150",
                    selectedType === type 
                      ? "bg-blue-500 text-white shadow-none translate-x-[2px] translate-y-[2px]" 
                      : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px]",
                    "dark:border-white",
                    selectedType === type 
                      ? "dark:shadow-none"
                      : "dark:bg-slate-700 dark:text-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* SUBJECT PICKER */}
            {selectedType === 'SUBJECT' && (
              <div className="mb-6">
                <label className="block text-xs font-black text-black dark:text-white uppercase mb-3">Select Subject</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {subjects.map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={clsx(
                        "p-3 border-[3px] border-black text-left font-bold transition-all duration-150",
                        selectedSubjectId === sub.id 
                          ? "bg-blue-100 shadow-none translate-x-[2px] translate-y-[2px]" 
                          : "bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px]",
                        "dark:border-white",
                        selectedSubjectId === sub.id 
                          ? "dark:bg-blue-900/30 dark:shadow-none"
                          : "dark:bg-slate-700 dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-[2px] border-black dark:border-white" style={{backgroundColor: sub.color_hex}}/>
                        <span className="text-sm text-black dark:text-white">{sub.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {subjects.length === 0 && (
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-center py-4">
                    No subjects yet. <Link href="/subjects" className="text-blue-500 underline">Add some first!</Link>
                  </p>
                )}
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
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
                type="button"
                onClick={handleSaveSlot}
                className={clsx(
                  "flex-1 py-3 px-4 font-black text-base text-white",
                  "border-[3px] border-black bg-blue-500",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                )}
              >
                {editingSlotId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
