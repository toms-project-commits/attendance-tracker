'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  addMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import {
  GraduationCap,
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Flame,
  Leaf,
  Zap,
  Rocket,
  RefreshCw,
  Calendar,
  PlusCircle,
} from 'lucide-react';

type Semester = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type Step = 'archive' | 'retention' | 'dates' | 'schedule' | 'confirm';

const ALL_STEPS: { key: Step; label: string; color: string; textColor: string }[] = [
  { key: 'archive',   label: 'Archive',  color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400' },
  { key: 'retention', label: 'Subjects', color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400' },
  { key: 'dates',     label: 'Dates',    color: 'bg-blue-500',   textColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'schedule',  label: 'Schedule', color: 'bg-teal-500',   textColor: 'text-teal-600 dark:text-teal-400' },
  { key: 'confirm',   label: 'Confirm',  color: 'bg-green-500',  textColor: 'text-green-600 dark:text-green-400' },
];

// Steps when no active semester exists — skip archive & retention
const NO_SEMESTER_STEPS: Step[] = ['dates', 'schedule', 'confirm'];

const ordinalSuffix = ['', '1st', '2nd', '3rd', '4th', '5th'];

export default function NewSemesterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('archive');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing semester
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [hasActiveSemester, setHasActiveSemester] = useState(true);

  // Step 1 — Archive
  const [archiveName, setArchiveName] = useState('');

  // Step 2 — Retention
  const [retainData, setRetainData] = useState(true);

  // Step 3 — Dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newSemesterName, setNewSemesterName] = useState('');

  // Step 4 — Schedule
  const [saturdayOffs, setSaturdayOffs] = useState<number[]>([]);
  const [manualHolidays, setManualHolidays] = useState<Date[]>([]);

  // Derived: which steps are active based on whether there's an active semester
  const activeSteps = hasActiveSemester
    ? ALL_STEPS
    : ALL_STEPS.filter((s) => NO_SEMESTER_STEPS.includes(s.key));

  const currentStepIndex = activeSteps.findIndex((s) => s.key === step);
  const currentStepMeta = activeSteps[currentStepIndex] ?? activeSteps[0];

  const fetchCurrentSemester = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Load active semester
      const { data: semData } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (semData) {
        setCurrentSemester(semData);
        setArchiveName(`${semData.name} (Archived)`);
        setHasActiveSemester(true);
        setStep('archive');
      } else {
        // No active semester — skip archive/retention, go straight to dates
        setCurrentSemester(null);
        setHasActiveSemester(false);
        setStep('dates');
      }

      // Load existing saturday_offs from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('saturday_offs')
        .eq('id', user.id)
        .single();

      if (profileData?.saturday_offs) {
        setSaturdayOffs(profileData.saturday_offs);
      }

      // Load existing holidays (to pre-populate if desired — start fresh for new semester)
      // We intentionally start with empty holidays for a clean new semester
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load semester data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchCurrentSemester(); }, [fetchCurrentSemester]);

  // ── Saturday helpers ──
  const toggleSaturdayRule = (weekNum: number) => {
    setSaturdayOffs((prev) =>
      prev.includes(weekNum) ? prev.filter((n) => n !== weekNum) : [...prev, weekNum].sort()
    );
  };

  // ── Holiday helpers ──
  const toggleHoliday = (date: Date) => {
    const exists = manualHolidays.find((d) => isSameDay(d, date));
    if (exists) {
      setManualHolidays((prev) => prev.filter((d) => !isSameDay(d, date)));
    } else {
      setManualHolidays((prev) => [...prev, date]);
    }
  };

  const getMonthsToDisplay = () => {
    if (!startDate || !endDate) return [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (start > end) return [];
    const months: Date[] = [];
    let current = startOfMonth(start);
    while (current <= end) {
      months.push(current);
      current = addMonths(current, 1);
    }
    return months;
  };

  const isSaturdayOff = (day: Date): boolean => {
    if (getDay(day) !== 6) return false;
    const firstOfMonth = startOfMonth(day);
    let firstSat: Date | null = null;
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstOfMonth);
      d.setDate(i + 1);
      if (getDay(d) === 6) { firstSat = d; break; }
    }
    if (!firstSat) return false;
    const diff = Math.floor((day.getTime() - firstSat.getTime()) / 86400000);
    const weekNum = Math.floor(diff / 7) + 1;
    return weekNum >= 1 && weekNum <= 5 && saturdayOffs.includes(weekNum);
  };

  // ── Step 1: just validate & advance (NO DB call yet) ──
  const handleArchiveNext = () => {
    if (!currentSemester || !archiveName.trim()) {
      setError('Please provide a name for the archived semester');
      return;
    }
    setError(null);
    setStep('retention');
  };

  // ── Final create: archive old + create new + update profile + save holidays ──
  const handleCreateSemester = async () => {
    if (!newSemesterName.trim() || !startDate || !endDate) {
      setError('Please fill in all fields'); return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date'); return;
    }
    setProcessing(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Archive current semester (only if one exists)
      if (hasActiveSemester && currentSemester) {
        const { error: archiveError } = await supabase.rpc('archive_semester', {
          p_user_id: user.id,
          p_semester_id: currentSemester.id,
          p_archive_name: archiveName.trim(),
        });
        if (archiveError) throw archiveError;
      }

      // 2. Create new semester
      const { data: newSemester, error: createError } = await supabase
        .from('semesters')
        .insert({
          user_id: user.id,
          name: newSemesterName.trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: true,
        })
        .select()
        .single();
      if (createError) throw createError;

      // 3. Update profile with new semester dates + saturday offs
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          semester_start: startDate,
          semester_end: endDate,
          saturday_offs: saturdayOffs,
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // 4. Replace holidays with new set
      await supabase.from('holidays').delete().eq('user_id', user.id);
      if (manualHolidays.length > 0) {
        const holidayData = manualHolidays.map((date) => ({
          user_id: user.id,
          date: format(date, 'yyyy-MM-dd'),
          name: 'Manual Holiday',
        }));
        const { error: holidayError } = await supabase.from('holidays').insert(holidayData);
        if (holidayError) throw holidayError;
      }

      // 5. Clone subjects/timetable if requested
      if (retainData && hasActiveSemester && currentSemester) {
        const { error: cloneError } = await supabase.rpc('clone_semester_data', {
          p_user_id: user.id,
          p_from_semester_id: currentSemester.id,
          p_to_semester_id: newSemester.id,
        });
        if (cloneError) {
          console.error('Clone error:', cloneError);
          setError('Semester created but data cloning failed. You can add subjects manually.');
          setProcessing(false);
          return;
        }
      }

      router.push('/dashboard?semester_reset=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create new semester');
    } finally {
      setProcessing(false);
    }
  };

  // ── Navigate between steps ──
  const prevStep = () => {
    const idx = activeSteps.findIndex((s) => s.key === step);
    if (idx > 0) setStep(activeSteps[idx - 1].key);
  };
  const nextStep = () => {
    const idx = activeSteps.findIndex((s) => s.key === step);
    if (idx < activeSteps.length - 1) setStep(activeSteps[idx + 1].key);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-yellow-400 p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
          <span className="text-xl font-black flex items-center gap-3 text-black">
            <Loader2 className="animate-spin" size={28} /> Loading semester data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex justify-center" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl w-full">

        {/* ── HEADER ── */}
        <div className="border-[3px] border-black bg-purple-500 p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <GraduationCap size={32} /> New Semester Setup
          </h1>
          <p className="text-white/80 mt-2 font-semibold">
            {hasActiveSemester ? 'Archive your current semester and start fresh' : 'Create a new semester to start tracking'}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="bg-white/20 border-[2px] border-white px-3 py-1 text-xs font-black text-white uppercase flex items-center gap-1.5">
              <Flame size={12} /> {activeSteps.length}-step process
            </span>
            <span className="bg-white/20 border-[2px] border-white px-3 py-1 text-xs font-black text-white uppercase flex items-center gap-1.5">
              <Leaf size={12} /> Keeps your history
            </span>
            <span className="bg-white/20 border-[2px] border-white px-3 py-1 text-xs font-black text-white uppercase flex items-center gap-1.5">
              <Zap size={12} /> Quick setup
            </span>
          </div>
        </div>

        {/* ── NO ACTIVE SEMESTER BANNER ── */}
        {!hasActiveSemester && (
          <div className="border-[3px] border-black bg-amber-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white flex items-start gap-3 mb-6">
            <Info className="shrink-0 mt-0.5 text-black" size={20} />
            <div>
              <p className="font-black text-black text-sm uppercase">No active semester found</p>
              <p className="text-black text-sm font-semibold mt-1">
                It looks like no active semester exists. Let&apos;s create one now!
              </p>
            </div>
          </div>
        )}

        {/* ── PROGRESS STEPPER ── */}
        <div className="border-[3px] border-black bg-white dark:bg-slate-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-6">
          <div className="flex items-center">
            {activeSteps.map(({ key, label, color, textColor }, idx) => {
              const isCurrent = key === step;
              const isDone = idx < currentStepIndex;
              return (
                <div key={key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5 min-w-[44px]">
                    <div className={clsx(
                      'w-10 h-10 border-[3px] border-black dark:border-white flex items-center justify-center font-black text-sm transition-all duration-200',
                      isCurrent
                        ? `${color} text-white scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]`
                        : isDone
                          ? 'bg-green-500 text-white'
                          : 'bg-white dark:bg-slate-700 text-gray-400 dark:text-gray-500'
                    )}>
                      {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                    </div>
                    <span className={clsx(
                      'text-[10px] font-black uppercase hidden sm:block',
                      isCurrent ? textColor : isDone ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                    )}>
                      {label}
                    </span>
                  </div>
                  {idx < activeSteps.length - 1 && (
                    <div className={clsx(
                      'flex-1 h-[3px] mx-1',
                      isDone ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-600'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className="border-[3px] border-black bg-red-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white flex items-start gap-3 mb-6">
            <AlertTriangle className="shrink-0 mt-0.5 text-black" size={20} />
            <p className="text-sm font-bold text-black">{error}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 1 — ARCHIVE  (Orange)
        ══════════════════════════════════════════ */}
        {step === 'archive' && (
          <div className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-orange-50 dark:bg-orange-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="bg-orange-500 px-6 py-3 flex items-center gap-3 border-b-[3px] border-black dark:border-white">
              <Archive size={20} className="text-white" />
              <h2 className="text-base font-black text-white uppercase tracking-wide">Step 1 — Archive Current Semester</h2>
            </div>

            <div className="p-6 space-y-5">
              <div className="border-[3px] border-black bg-yellow-400 p-4 flex gap-3 items-start">
                <AlertTriangle className="shrink-0 mt-0.5 text-black" size={18} />
                <div>
                  <p className="font-black text-black text-sm uppercase">Note</p>
                  <p className="text-black text-sm font-semibold mt-1">
                    Your current semester will be archived (frozen) when you complete the setup. You can cancel at any time before the final step.
                  </p>
                </div>
              </div>

              {/* Current semester display */}
              <div>
                <label className="block text-xs font-black text-orange-700 dark:text-orange-400 uppercase mb-2">Current Active Semester</label>
                <div className="border-[3px] border-black bg-orange-200 dark:bg-orange-900/40 dark:border-white p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500 border-[2px] border-black dark:border-white flex items-center justify-center shrink-0">
                    <Archive size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black text-black dark:text-white text-lg leading-tight">{currentSemester?.name}</p>
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mt-0.5">
                      {currentSemester && `${new Date(currentSemester.start_date).toLocaleDateString()} – ${new Date(currentSemester.end_date).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Archive name input */}
              <div>
                <label className="block text-xs font-black text-orange-700 dark:text-orange-400 uppercase mb-2">Archive Name</label>
                <input
                  type="text"
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  className={clsx(
                    'w-full p-3 text-base font-semibold border-[3px] border-black bg-white',
                    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                    'transition-all duration-150 placeholder:text-gray-400',
                    'dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
                  )}
                  placeholder="e.g., Fall 2025 (Archived)"
                  maxLength={100}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                  )}
                >
                  <ChevronLeft size={18} /> Cancel
                </button>
                <button
                  onClick={handleArchiveNext}
                  disabled={!archiveName.trim()}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm text-white flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-orange-500',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
                  )}
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 2 — SUBJECT RETENTION  (Purple)
        ══════════════════════════════════════════ */}
        {step === 'retention' && (
          <div className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-purple-50 dark:bg-purple-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="bg-purple-500 px-6 py-3 flex items-center gap-3 border-b-[3px] border-black dark:border-white">
              <BookOpen size={20} className="text-white" />
              <h2 className="text-base font-black text-white uppercase tracking-wide">Step 2 — Subject Retention</h2>
            </div>

            <div className="p-6 space-y-5">
              <div className="border-[3px] border-black bg-purple-200 dark:bg-purple-900/40 dark:border-white p-4 flex gap-3 items-start">
                <Info className="shrink-0 mt-0.5 text-purple-700 dark:text-purple-300" size={16} />
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                  Do you want to carry over your current subjects and timetable into the new semester?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setRetainData(true)}
                  className={clsx(
                    'w-full p-5 border-[3px] border-black text-left transition-all duration-150 flex items-center gap-4',
                    retainData
                      ? 'bg-green-500 shadow-none translate-x-[2px] translate-y-[2px]'
                      : 'bg-white dark:bg-slate-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-[1px] hover:-translate-y-[1px]',
                    'dark:border-white'
                  )}
                >
                  <div className={clsx(
                    'w-10 h-10 border-[3px] border-black dark:border-white flex items-center justify-center shrink-0',
                    retainData ? 'bg-white' : 'bg-green-100 dark:bg-green-900/30'
                  )}>
                    <CheckCircle2 size={20} className={retainData ? 'text-green-600' : 'text-green-500'} />
                  </div>
                  <div>
                    <p className={clsx('font-black text-base flex items-center gap-2', retainData ? 'text-white' : 'text-black dark:text-white')}>
                      <CheckCircle2 size={16} className="shrink-0" /> Yes, Clone My Subjects &amp; Timetable
                    </p>
                    <p className={clsx('text-sm font-semibold mt-0.5', retainData ? 'text-white/80' : 'text-gray-600 dark:text-gray-400')}>
                      Copy all subjects and timetable slots to the new semester
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setRetainData(false)}
                  className={clsx(
                    'w-full p-5 border-[3px] border-black text-left transition-all duration-150 flex items-center gap-4',
                    !retainData
                      ? 'bg-blue-500 shadow-none translate-x-[2px] translate-y-[2px]'
                      : 'bg-white dark:bg-slate-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-[1px] hover:-translate-y-[1px]',
                    'dark:border-white'
                  )}
                >
                  <div className={clsx(
                    'w-10 h-10 border-[3px] border-black dark:border-white flex items-center justify-center shrink-0',
                    !retainData ? 'bg-white' : 'bg-blue-100 dark:bg-blue-900/30'
                  )}>
                    <Sparkles size={20} className={!retainData ? 'text-blue-600' : 'text-blue-500'} />
                  </div>
                  <div>
                    <p className={clsx('font-black text-base flex items-center gap-2', !retainData ? 'text-white' : 'text-black dark:text-white')}>
                      <RefreshCw size={16} className="shrink-0" /> No, Start with a Clean Slate
                    </p>
                    <p className={clsx('text-sm font-semibold mt-0.5', !retainData ? 'text-white/80' : 'text-gray-600 dark:text-gray-400')}>
                      Begin fresh — you&apos;ll add subjects manually
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={prevStep} className={clsx(
                  'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                  'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                  'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                  'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                  'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                )}>
                  <ChevronLeft size={18} /> Back
                </button>
                <button onClick={nextStep} className={clsx(
                  'flex-1 py-3 font-black text-sm text-white flex items-center justify-center gap-2',
                  'border-[3px] border-black bg-purple-500',
                  'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                  'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                  'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150',
                  'dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
                )}>
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 3 — DATES  (Blue)
        ══════════════════════════════════════════ */}
        {step === 'dates' && (
          <div className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-blue-50 dark:bg-blue-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="bg-blue-500 px-6 py-3 flex items-center gap-3 border-b-[3px] border-black dark:border-white">
              <CalendarDays size={20} className="text-white" />
              <h2 className="text-base font-black text-white uppercase tracking-wide">
                Step {activeSteps.findIndex(s => s.key === 'dates') + 1} — New Semester Dates
              </h2>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-blue-700 dark:text-blue-400 uppercase mb-2">Semester Name</label>
                <input
                  type="text"
                  value={newSemesterName}
                  onChange={(e) => setNewSemesterName(e.target.value)}
                  className={clsx(
                    'w-full p-3 text-base font-semibold border-[3px] border-black bg-white',
                    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                    'transition-all duration-150 placeholder:text-gray-400',
                    'dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
                  )}
                  placeholder="e.g., Spring 2026"
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-blue-700 dark:text-blue-400 uppercase mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={clsx(
                      'w-full p-3 text-base font-semibold border-[3px] border-black bg-white',
                      'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none',
                      'dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-blue-700 dark:text-blue-400 uppercase mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={clsx(
                      'w-full p-3 text-base font-semibold border-[3px] border-black bg-white',
                      'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none',
                      'dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
                    )}
                  />
                </div>
              </div>

              {startDate && endDate && new Date(endDate) > new Date(startDate) && (
                <div className="border-[3px] border-black bg-green-400 p-4 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-black shrink-0" />
                  <p className="font-black text-black text-sm">
                    Duration:{' '}
                    {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)} days
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {hasActiveSemester ? (
                  <button onClick={prevStep} className={clsx(
                    'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                  )}>
                    <ChevronLeft size={18} /> Back
                  </button>
                ) : (
                  <button onClick={() => router.push('/dashboard')} className={clsx(
                    'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                  )}>
                    <ChevronLeft size={18} /> Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!newSemesterName.trim() || !startDate || !endDate) { setError('Please fill in all fields'); return; }
                    if (new Date(startDate) >= new Date(endDate)) { setError('End date must be after start date'); return; }
                    setError(null);
                    nextStep();
                  }}
                  disabled={!newSemesterName.trim() || !startDate || !endDate}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm text-white flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-blue-500',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
                  )}
                >
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 4 — SCHEDULE: Saturday Rules + Holidays  (Teal)
        ══════════════════════════════════════════ */}
        {step === 'schedule' && (
          <div className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-teal-50 dark:bg-teal-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="bg-teal-500 px-6 py-3 flex items-center gap-3 border-b-[3px] border-black dark:border-white">
              <Calendar size={20} className="text-white" />
              <h2 className="text-base font-black text-white uppercase tracking-wide">
                Step {activeSteps.findIndex(s => s.key === 'schedule') + 1} — Schedule & Holidays
              </h2>
            </div>

            <div className="p-6 space-y-8">

              {/* ─── Saturday Rules ─── */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-500 border-[2px] border-black dark:border-white flex items-center justify-center text-white font-black text-sm">
                    SAT
                  </div>
                  <h3 className="text-lg font-black text-black dark:text-white uppercase">Saturday Rules</h3>
                </div>

                <div className="border-[3px] border-black bg-blue-100 p-3 mb-4 dark:border-white dark:bg-blue-900/30">
                  <div className="flex gap-2 items-start">
                    <Info className="shrink-0 mt-0.5 text-black dark:text-blue-400" size={16} />
                    <p className="text-xs font-bold text-black dark:text-blue-300">
                      Select which Saturdays are <strong>holidays</strong>. Unselected ones are working days.
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
                          'p-2 md:p-3 border-[3px] border-black font-black text-[10px] md:text-xs transition-all duration-150 min-h-[60px] md:min-h-0',
                          isOff
                            ? 'bg-red-500 text-white shadow-none translate-x-[2px] translate-y-[2px]'
                            : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px]',
                          'dark:border-white',
                          isOff ? 'dark:shadow-none' : 'dark:bg-slate-700 dark:text-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
                        )}
                      >
                        <div className="text-center flex flex-col items-center justify-center gap-0.5">
                          <div className="leading-tight">{ordinalSuffix[num]}</div>
                          <div className="leading-tight">SAT</div>
                          <div className="text-[8px] leading-tight">{isOff ? 'OFF' : 'WORK'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {saturdayOffs.length > 0 && (
                  <p className="mt-3 text-xs font-bold text-teal-700 dark:text-teal-400">
                    ✓ {saturdayOffs.map((n) => `${ordinalSuffix[n]} Saturday`).join(', ')} off
                  </p>
                )}
                {saturdayOffs.length === 0 && (
                  <p className="mt-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                    All Saturdays are working days. Tap any to mark as off.
                  </p>
                )}
              </div>

              {/* ─── Divider ─── */}
              <div className="border-t-[3px] border-black dark:border-white" />

              {/* ─── Specific Holidays ─── */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500 border-[2px] border-black dark:border-white flex items-center justify-center text-white">
                    <PlusCircle size={20} />
                  </div>
                  <h3 className="text-lg font-black text-black dark:text-white uppercase">Custom Holidays</h3>
                </div>

                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                  Tap dates to mark them as holidays (festivals, exam breaks, etc.)
                </p>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                    <div className="w-5 h-5 bg-red-200 border-[2px] border-black dark:border-white" />
                    Auto-off (Sun / Sat off)
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                    <div className="w-5 h-5 bg-red-500 border-[2px] border-black dark:border-white" />
                    Custom holiday
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                    <div className="w-5 h-5 bg-white dark:bg-slate-600 border-[2px] border-black dark:border-white" />
                    Working day
                  </div>
                </div>

                {startDate && endDate && new Date(endDate) > new Date(startDate) ? (
                  <>
                    {manualHolidays.length > 0 && (
                      <div className="border-[3px] border-black bg-red-100 dark:bg-red-900/30 dark:border-white p-3 mb-4 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                        <p className="text-xs font-bold text-red-700 dark:text-red-400">
                          {manualHolidays.length} custom holiday{manualHolidays.length !== 1 ? 's' : ''} marked
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {getMonthsToDisplay().map((monthStart) => (
                        <div key={monthStart.toString()} className="border-[3px] border-black p-4 bg-gray-50 dark:bg-slate-700 dark:border-white">
                          <h4 className="font-black text-black dark:text-white mb-3 text-center">
                            {format(monthStart, 'MMMM yyyy')}
                          </h4>
                          <div className="grid grid-cols-7 text-xs font-black text-gray-500 dark:text-gray-400 mb-2 text-center">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: getDay(monthStart) }).map((_, i) => (
                              <div key={`empty-${i}`} />
                            ))}
                            {eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) }).map((day) => {
                              const isInRange = isWithinInterval(day, {
                                start: parseISO(startDate),
                                end: parseISO(endDate),
                              });
                              if (!isInRange) return <div key={day.toString()} />;

                              const isManualHoliday = manualHolidays.some((d) => isSameDay(d, day));
                              const isSunday = getDay(day) === 0;
                              const satOff = isSaturdayOff(day);
                              const isAutoHoliday = isSunday || satOff;

                              return (
                                <button
                                  key={day.toString()}
                                  onClick={() => toggleHoliday(day)}
                                  disabled={isAutoHoliday}
                                  title={isAutoHoliday ? (isSunday ? 'Sunday' : 'Saturday off') : isManualHoliday ? 'Click to remove holiday' : 'Click to mark as holiday'}
                                  className={clsx(
                                    'aspect-square text-xs font-bold flex items-center justify-center transition-all border-[2px] border-black dark:border-white',
                                    isAutoHoliday
                                      ? 'bg-red-200 text-red-600 cursor-not-allowed dark:bg-red-900/30 dark:text-red-500'
                                      : isManualHoliday
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white text-black hover:bg-blue-100 dark:bg-slate-600 dark:text-white dark:hover:bg-blue-900/30'
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
                  </>
                ) : (
                  <div className="border-[3px] border-black bg-gray-100 dark:bg-slate-700 dark:border-white p-6 text-center">
                    <CalendarDays size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                      Go back and set semester dates to configure holidays.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={prevStep} className={clsx(
                  'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                  'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                  'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                  'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                  'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                )}>
                  <ChevronLeft size={18} /> Back
                </button>
                <button onClick={() => { setError(null); nextStep(); }} className={clsx(
                  'flex-1 py-3 font-black text-sm text-white flex items-center justify-center gap-2',
                  'border-[3px] border-black bg-teal-500',
                  'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                  'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                  'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150',
                  'dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
                )}>
                  Review <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 5 — CONFIRM  (Green)
        ══════════════════════════════════════════ */}
        {step === 'confirm' && (
          <div className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-green-50 dark:bg-green-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="bg-green-500 px-6 py-3 flex items-center gap-3 border-b-[3px] border-black dark:border-white">
              <CheckCircle2 size={20} className="text-white" />
              <h2 className="text-base font-black text-white uppercase tracking-wide">
                Step {activeSteps.findIndex(s => s.key === 'confirm') + 1} — Confirm &amp; Create
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary card */}
              <div className="border-[3px] border-black bg-green-200 dark:bg-green-900/40 dark:border-white p-5">
                <p className="text-xs font-black text-green-800 dark:text-green-300 uppercase mb-3 flex items-center gap-2">
                  <Sparkles size={14} /> New Semester Summary
                </p>
                <ul className="space-y-2.5">
                  {[
                    { icon: <Sparkles size={14} className="text-green-600 dark:text-green-400" />, label: 'Name', value: newSemesterName },
                    { icon: <CalendarDays size={14} className="text-blue-600 dark:text-blue-400" />, label: 'Start', value: startDate ? new Date(startDate).toLocaleDateString() : '—' },
                    { icon: <CalendarDays size={14} className="text-blue-600 dark:text-blue-400" />, label: 'End', value: endDate ? new Date(endDate).toLocaleDateString() : '—' },
                    {
                      icon: <Calendar size={14} className="text-orange-600 dark:text-orange-400" />,
                      label: 'Saturday offs',
                      value: saturdayOffs.length === 0
                        ? 'All Saturdays are working'
                        : saturdayOffs.map((n) => ordinalSuffix[n]).join(', ') + ' Saturday off',
                    },
                    {
                      icon: <PlusCircle size={14} className="text-red-600 dark:text-red-400" />,
                      label: 'Custom holidays',
                      value: manualHolidays.length === 0 ? 'None' : `${manualHolidays.length} day${manualHolidays.length !== 1 ? 's' : ''} marked`,
                    },
                    ...(hasActiveSemester ? [
                      { icon: <BookOpen size={14} className="text-purple-600 dark:text-purple-400" />, label: 'Subjects', value: retainData ? 'Will be cloned' : 'Fresh start' },
                    ] : []),
                  ].map(({ icon, label, value }) => (
                    <li key={label} className="flex items-start gap-2 text-sm font-semibold text-black dark:text-white">
                      <span className="shrink-0 mt-0.5">{icon}</span>
                      <span className="text-gray-600 dark:text-gray-400 font-semibold shrink-0">{label}:</span>
                      <span className="font-black">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What happens next */}
              <div className="border-[3px] border-black bg-blue-100 dark:bg-blue-900/30 dark:border-white p-4">
                <div className="flex gap-2 items-start">
                  <Info className="shrink-0 mt-0.5 text-blue-700 dark:text-blue-400" size={16} />
                  <div>
                    <p className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase mb-2">What Happens Next</p>
                    <ul className="space-y-1 text-sm font-semibold text-blue-900 dark:text-blue-200">
                      {[
                        hasActiveSemester ? 'Current semester will be archived (read-only)' : null,
                        'New semester becomes active immediately',
                        'Your Saturday rules and holidays will be saved',
                        hasActiveSemester && retainData ? 'All subjects & timetable will be copied over' : null,
                        'Historical attendance logs stay with archived semester',
                      ].filter(Boolean).map((item) => (
                        <li key={item as string} className="flex items-center gap-2">
                          <ArrowRight size={12} className="shrink-0" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={prevStep}
                  disabled={processing}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150 disabled:opacity-50'
                  )}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <button
                  onClick={handleCreateSemester}
                  disabled={processing}
                  className={clsx(
                    'flex-1 py-4 font-black text-base text-white flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-green-500',
                    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
                    'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
                    'dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
                  )}
                >
                  {processing
                    ? <><Loader2 className="animate-spin" size={20} /> Creating...</>
                    : <><Rocket size={20} /> Create New Semester <ChevronRight size={20} /></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step hint footer ── */}
        {currentStepMeta && (
          <div className={clsx(
            'mt-4 border-[3px] border-black p-3 flex items-center gap-3',
            currentStepMeta.color,
            'dark:border-white'
          )}>
            <Info size={16} className="text-white shrink-0" />
            <p className="text-xs font-bold text-white">
              {step === 'archive' && 'The archive will only happen after you confirm everything in the last step — you can cancel any time.'}
              {step === 'retention' && 'Cloning saves you from re-entering subjects — you can still edit them after creation.'}
              {step === 'dates' && 'Semester dates determine which days attendance is tracked. Choose carefully!'}
              {step === 'schedule' && 'Set your recurring Saturday offs and mark specific holidays for the new semester.'}
              {step === 'confirm' && 'Review everything above before creating. The archive + creation happens now!'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
