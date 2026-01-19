'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronRight, Calendar as CalIcon, Info, AlertCircle, User, Loader2 } from 'lucide-react';
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
import { clsx } from 'clsx';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // --- STATE ---
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saturdayOffs, setSaturdayOffs] = useState<number[]>([]); 
  const [manualHolidays, setManualHolidays] = useState<Date[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (profile?.username) {
          setUsername(profile.username);
          setUsernameAvailable(true);
        }
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(usernameToCheck)) {
      setUsernameError('Username must be 3-20 characters (letters, numbers, underscore only)');
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', usernameToCheck)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.id !== user?.id) {
        setUsernameError('This username is already taken');
        setUsernameAvailable(false);
      } else {
        setUsernameError(null);
        setUsernameAvailable(true);
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameError('Could not verify username availability');
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username && username.length >= 3) {
        checkUsernameAvailability(username);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, checkUsernameAvailability]);

  const toggleSaturdayRule = (weekNum: number) => {
    setSaturdayOffs(prev => 
      prev.includes(weekNum) ? prev.filter(n => n !== weekNum) : [...prev, weekNum].sort()
    );
  };

  const toggleHoliday = (date: Date) => {
    const exists = manualHolidays.find(d => isSameDay(d, date));
    if (exists) {
      setManualHolidays(prev => prev.filter(d => !isSameDay(d, date)));
    } else {
      setManualHolidays(prev => [...prev, date]);
    }
  };

  const handleSave = async () => {
    if (!username) {
      setError('Please choose a username');
      return;
    }

    if (!usernameAvailable) {
      setError('Please choose a valid and available username');
      return;
    }

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

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (existingProfile?.username && existingProfile.username !== username) {
        setError('Username cannot be changed once set');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username.toLowerCase(),
          semester_start: startDate,
          semester_end: endDate,
          saturday_offs: saturdayOffs,
          weekly_offs: [0], 
        }, {
          onConflict: 'id'
        });
      
      if (profileError) throw profileError;

      await supabase
        .from('holidays')
        .delete()
        .eq('user_id', user.id);

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

  const ordinalSuffix = ["", "1st", "2nd", "3rd", "4th", "5th"];

  return (
    <div className="min-h-screen p-4 md:p-8 flex justify-center" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl w-full">
        {/* HEADER CARD */}
        <div className="border-[3px] border-black bg-blue-500 p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <CalIcon size={32} /> Semester Setup
          </h1>
          <p className="text-white/80 mt-2 font-semibold">Let&apos;s configure your academic calendar</p>
        </div>

        {checkingAuth ? (
          <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white text-center">
            <Loader2 className="animate-spin mx-auto mb-2 text-black" size={32} />
            <p className="font-bold text-black">Checking authentication...</p>
          </div>
        ) : (
        <div className="space-y-6">
          
          {/* ERROR MESSAGE */}
          {error && (
            <div className="border-[3px] border-black bg-red-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3 dark:border-white">
              <AlertCircle className="shrink-0 mt-0.5 text-black" size={20} />
              <p className="text-sm font-bold text-black">{error}</p>
            </div>
          )}

          {/* STEP 0: USERNAME */}
          <section className="border-[3px] border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500 border-[2px] border-black dark:border-white flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-black text-black dark:text-white uppercase">Choose Username</h3>
            </div>
            
            <div className="border-[3px] border-black bg-amber-100 p-3 mb-4 dark:border-white dark:bg-amber-900/30">
              <div className="flex gap-2 items-start">
                <Info className="shrink-0 mt-0.5 text-black dark:text-amber-400" size={16} />
                <p className="text-xs font-bold text-black dark:text-amber-300">
                  Your username is <strong>permanent</strong> and cannot be changed later!
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-black text-black dark:text-white uppercase mb-2">
                Username (3-20 characters)
              </label>
              <div className="relative">
                <input 
                  id="username"
                  type="text" 
                  className={clsx(
                    "w-full p-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]",
                    "transition-all duration-150",
                    "placeholder:text-gray-400",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    usernameError && "border-red-500",
                    usernameAvailable === true && "border-green-500"
                  )}
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setUsername(val);
                    setUsernameAvailable(null);
                  }}
                  placeholder="e.g. john_doe123"
                  maxLength={20}
                  required
                  disabled={loading}
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-blue-600" size={20} />
                  </div>
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 font-black text-xl">✓</div>
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600 font-black text-xl">✗</div>
                )}
              </div>
              {usernameError && (
                <p className="text-xs font-bold text-red-600 mt-2">❌ {usernameError}</p>
              )}
              {usernameAvailable === true && !usernameError && (
                <p className="text-xs font-bold text-green-600 mt-2">✅ Username is available!</p>
              )}
            </div>
          </section>

          {/* STEP 1: DATE RANGE */}
          <section className="border-[3px] border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 border-[2px] border-black dark:border-white flex items-center justify-center text-white font-black">1</div>
              <h3 className="text-lg font-black text-black dark:text-white uppercase">Semester Dates</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-date" className="block text-xs font-black text-black dark:text-white uppercase mb-2">Start Date</label>
                <input 
                  id="start-date"
                  type="date" 
                  className={clsx(
                    "w-full p-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setError(null);
                  }}
                  required
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-xs font-black text-black dark:text-white uppercase mb-2">End Date</label>
                <input 
                  id="end-date"
                  type="date" 
                  className={clsx(
                    "w-full p-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setError(null);
                  }}
                  min={startDate}
                  required
                />
              </div>
            </div>
          </section>

          {/* STEP 2: SATURDAY RULES */}
          <section className="border-[3px] border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500 border-[2px] border-black dark:border-white flex items-center justify-center text-white font-black">2</div>
              <h3 className="text-lg font-black text-black dark:text-white uppercase">Saturday Rules</h3>
            </div>
            
            <div className="border-[3px] border-black bg-blue-100 p-3 mb-4 dark:border-white dark:bg-blue-900/30">
              <div className="flex gap-2 items-start">
                <Info className="shrink-0 mt-0.5 text-black dark:text-blue-400" size={16} />
                <p className="text-xs font-bold text-black dark:text-blue-300">
                  Select which Saturdays are holidays (e.g., &quot;2nd & 4th Saturdays off&quot;)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => {
                const isOff = saturdayOffs.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => toggleSaturdayRule(num)}
                    className={clsx(
                      "p-3 border-[3px] border-black font-black text-xs transition-all duration-150",
                      isOff 
                        ? "bg-red-500 text-white shadow-none translate-x-[2px] translate-y-[2px]" 
                        : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px]",
                      "dark:border-white",
                      isOff 
                        ? "dark:shadow-none"
                        : "dark:bg-slate-700 dark:text-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                    )}
                  >
                    <div className="text-center">
                      <div>{ordinalSuffix[num]}</div>
                      <div>SAT</div>
                      <div className="text-[8px] mt-1">{isOff ? 'OFF' : 'WORK'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 3: CALENDAR */}
          {startDate && endDate && (
            <section className="border-[3px] border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500 border-[2px] border-black dark:border-white flex items-center justify-center text-white font-black">3</div>
                <h3 className="text-lg font-black text-black dark:text-white uppercase">Specific Holidays</h3>
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                Tap dates to mark them as holidays (festivals, exam breaks, etc.)
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getMonthsToDisplay().map((monthStart) => (
                  <div key={monthStart.toString()} className="border-[3px] border-black p-4 bg-gray-50 dark:bg-slate-700 dark:border-white">
                    <h4 className="font-black text-black dark:text-white mb-3 text-center">
                      {format(monthStart, 'MMMM yyyy')}
                    </h4>
                    
                    {/* Days Header */}
                    <div className="grid grid-cols-7 text-xs font-black text-gray-500 dark:text-gray-400 mb-2 text-center">
                      {['S','M','T','W','T','F','S'].map((d, i) => <div key={i}>{d}</div>)}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: getDay(monthStart) }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}

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
                        
                        let isSaturdayOff = false;
                        if (getDay(day) === 6) {
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

                        const isAutoHoliday = isSunday || isSaturdayOff;

                        return (
                          <button
                            key={day.toString()}
                            onClick={() => toggleHoliday(day)}
                            disabled={isAutoHoliday}
                            className={clsx(
                              "aspect-square text-xs font-bold flex items-center justify-center transition-all border-[2px] border-black dark:border-white",
                              isAutoHoliday 
                                ? "bg-red-200 text-red-600 cursor-not-allowed dark:bg-red-900/30 dark:text-red-500"
                                : isManualHoliday
                                  ? "bg-red-500 text-white"
                                  : "bg-white text-black hover:bg-blue-100 dark:bg-slate-600 dark:text-white dark:hover:bg-blue-900/30"
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
            disabled={!username || !usernameAvailable || !startDate || !endDate || loading || checkingUsername}
            className={clsx(
              "w-full py-4 font-black text-lg text-white flex items-center justify-center gap-3",
              "border-[3px] border-black bg-green-500",
              "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
              "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
              "active:translate-x-[6px] active:translate-y-[6px] active:shadow-none",
              "transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
              "dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
            )}
            aria-label="Save semester setup and continue"
          >
            {loading ? (
              <>Setting up... <Loader2 className="animate-spin" size={24} /></>
            ) : (
              <>🚀 Save & Continue <ChevronRight size={24} /></>
            )}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
