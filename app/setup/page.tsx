'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronRight, Calendar as CalIcon, Info, AlertCircle } from 'lucide-react';
import { 
  eachDayOfInterval, 
  endOfMonth, 
  format, 
  getDay, 
  isSameDay, 
  startOfMonth, 
  addMonths, 
  isWithinInterval,
  parseISO
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for cleaner code
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // --- STATE ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saturdayOffs, setSaturdayOffs] = useState<number[]>([]); 
  const [manualHolidays, setManualHolidays] = useState<Date[]>([]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  // --- LOGIC: SATURDAY TOGGLE ---
  const toggleSaturdayRule = (weekNum: number) => {
    setSaturdayOffs(prev => 
      prev.includes(weekNum) ? prev.filter(n => n !== weekNum) : [...prev, weekNum].sort()
    );
  };

  // --- LOGIC: CALENDAR CLICK ---
  const toggleHoliday = (date: Date) => {
    const exists = manualHolidays.find(d => isSameDay(d, date));
    if (exists) {
      setManualHolidays(prev => prev.filter(d => !isSameDay(d, date)));
    } else {
      setManualHolidays(prev => [...prev, date]);
    }
  };

  // --- LOGIC: SAVE EVERYTHING ---
  const handleSave = async () => {
    // Validation
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (start > end) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No user found. Please log in again.');
        return;
      }

      // 1. Upsert Profile (create if doesn't exist, update if exists)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          semester_start: startDate,
          semester_end: endDate,
          saturday_offs: saturdayOffs,
          weekly_offs: [0], 
        }, {
          onConflict: 'id'
        });
      
      if (profileError) throw profileError;

      // 2. Delete existing holidays for this user to prevent duplicates
      await supabase
        .from('holidays')
        .delete()
        .eq('user_id', user.id);

      // 3. Save Specific Holidays
      if (manualHolidays.length > 0) {
        const holidayData = manualHolidays.map(date => ({
          user_id: user.id,
          date: format(date, 'yyyy-MM-dd'),
          name: 'Manual Holiday'
        }));
        
        const { error: holidayError } = await supabase.from('holidays').insert(holidayData);
        if (holidayError) throw holidayError;
      }

      router.push('/dashboard');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER: GENERATE MONTHS ---
  const getMonthsToDisplay = () => {
    if (!startDate || !endDate) return [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (start > end) return [];

    const months = [];
    let current = startOfMonth(start);
    while (current <= end) {
      months.push(current);
      current = addMonths(current, 1);
    }
    return months;
  };

  // Labels for the buttons
  const ordinalSuffix = ["", "1st", "2nd", "3rd", "4th", "5th"];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-8 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalIcon /> Semester Setup
          </h1>
          <p className="text-slate-400 mt-2">Let's set up your calendar.</p> {/* eslint-disable-line react/no-unescaped-entities */}
        </div>

        {checkingAuth ? (
          <div className="p-8 flex items-center justify-center">
            <p className="text-slate-500">Checking authentication...</p>
          </div>
        ) : (
        <div className="p-8 space-y-10">
          
          {/* ERROR MESSAGE */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* STEP 1: DATE RANGE */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-2">1. Semester Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1">When does it start?</label>
                <input 
                  id="start-date"
                  type="date" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setError(null);
                    // Validate end date if it exists
                    if (endDate && e.target.value > endDate) {
                      setError('Start date must be before end date');
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">When does it end?</label>
                <input 
                  id="end-date"
                  type="date" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setError(null);
                    // Validate start date if it exists
                    if (startDate && e.target.value < startDate) {
                      setError('End date must be after start date');
                    }
                  }}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
          </section>

          {/* STEP 2: SATURDAY RULES (IMPROVED) */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-2">2. Recurring Saturdays</h3>
            
            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start text-sm text-blue-700">
              <Info className="shrink-0 mt-0.5" size={18} />
              <p>
                <strong>How to use:</strong> Does your college have a rule like "Second and Fourth Saturdays are off"? {/* eslint-disable-line react/no-unescaped-entities */}
                If yes, tap the <strong>2nd Sat</strong> and <strong>4th Sat</strong> buttons below.
                This will automatically mark them as holidays for the whole semester.
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => {
                const isOff = saturdayOffs.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => toggleSaturdayRule(num)}
                    className={cn(
                      "aspect-[4/5] rounded-xl flex flex-col items-center justify-center transition-all border-2 gap-1",
                      isOff 
                        ? "bg-red-50 border-red-500 text-red-600 shadow-sm" 
                        : "bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500"
                    )}
                  >
                    <span className="text-sm font-semibold">{ordinalSuffix[num]} Sat</span>
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", isOff ? "bg-red-100" : "bg-slate-100")}>
                      {isOff ? 'HOLIDAY' : 'WORKING'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 3: THE CALENDAR GRID */}
          {startDate && endDate && (
            <section className="space-y-6">
              <div className="flex justify-between items-end border-b pb-2">
                 <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">3. Specific Holidays</h3>
              </div>
              <p className="text-sm text-slate-500">Tap specific dates on the calendar below to toggle them as holidays (e.g., Festivals, Exam Breaks).</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {getMonthsToDisplay().map((monthStart) => (
                  <div key={monthStart.toString()} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-3 text-center">
                      {format(monthStart, 'MMMM yyyy')}
                    </h4>
                    
                    {/* Days Header */}
                    <div className="grid grid-cols-7 text-xs text-slate-400 mb-2 text-center font-semibold">
                      {['S','M','T','W','T','F','S'].map((d, i) => <div key={i}>{d}</div>)}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Blank spacers */}
                      {Array.from({ length: getDay(monthStart) }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}

                      {/* Actual Days */}
                      {eachDayOfInterval({
                        start: monthStart,
                        end: endOfMonth(monthStart)
                      }).map((day) => {
                        const isInRange = isWithinInterval(day, { 
                          start: parseISO(startDate), 
                          end: parseISO(endDate) 
                        });

                        if (!isInRange) return <div key={day.toString()} />;

                        const isManualHoliday = manualHolidays.some(d => isSameDay(d, day));
                        const isSunday = getDay(day) === 0;
                        
                        // Check Saturday Logic - Fixed calculation
                        let isSaturdayOff = false;
                        if (getDay(day) === 6) {
                            // Calculate which Saturday of the month (1st, 2nd, 3rd, 4th, 5th)
                            // Find the first Saturday of the month
                            const firstOfMonth = startOfMonth(day);
                            const firstSaturday = Array.from({ length: 7 }, (_, i) => {
                              const date = new Date(firstOfMonth);
                              date.setDate(i + 1);
                              return date;
                            }).find(d => getDay(d) === 6);
                            
                            if (firstSaturday) {
                              const daysDiff = Math.floor((day.getTime() - firstSaturday.getTime()) / (1000 * 60 * 60 * 24));
                              const weekNum = Math.floor(daysDiff / 7) + 1;
                              if (weekNum >= 1 && weekNum <= 5 && saturdayOffs.includes(weekNum)) {
                                isSaturdayOff = true;
                              }
                            }
                        }

                        // Determine Visual State
                        const isAutoHoliday = isSunday || isSaturdayOff;

                        return (
                          <button
                            key={day.toString()}
                            onClick={() => toggleHoliday(day)}
                            disabled={isAutoHoliday}
                            className={cn(
                              "aspect-square rounded-lg text-sm flex items-center justify-center transition-all",
                              isAutoHoliday 
                                ? "text-red-300 cursor-not-allowed font-medium bg-red-50/50" // Auto (Sun/Sat)
                                : isManualHoliday
                                  ? "bg-red-500 text-white shadow-sm font-bold" // Manual Clicked
                                  : "bg-white hover:bg-blue-50 text-slate-700 border border-slate-100 shadow-sm" // Normal
                            )}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            disabled={!startDate || !endDate || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Save semester setup and continue"
          >
            {loading ? 'Setting up...' : 'Save & Continue'} 
            {!loading && <ChevronRight size={20} />}
          </button>

        </div>
        )}
      </div>
    </div>
  );
}
