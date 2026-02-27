'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
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
} from 'lucide-react';

type Semester = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type Step = 'archive' | 'retention' | 'dates' | 'confirm';

const STEPS: { key: Step; label: string; color: string; textColor: string; lightBg: string; darkBg: string }[] = [
  { key: 'archive',   label: 'Archive',  color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400', lightBg: 'bg-orange-50',  darkBg: 'dark:bg-orange-950/20' },
  { key: 'retention', label: 'Subjects', color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400', lightBg: 'bg-purple-50',  darkBg: 'dark:bg-purple-950/20' },
  { key: 'dates',     label: 'Dates',    color: 'bg-blue-500',   textColor: 'text-blue-600 dark:text-blue-400',     lightBg: 'bg-blue-50',    darkBg: 'dark:bg-blue-950/20' },
  { key: 'confirm',   label: 'Confirm',  color: 'bg-green-500',  textColor: 'text-green-600 dark:text-green-400',   lightBg: 'bg-green-50',   darkBg: 'dark:bg-green-950/20' },
];

export default function NewSemesterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('archive');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [archiveName, setArchiveName] = useState('');
  const [retainData, setRetainData] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newSemesterName, setNewSemesterName] = useState('');

  const fetchCurrentSemester = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (data) {
        setCurrentSemester(data);
        setArchiveName(`${data.name} (Archived)`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load semester data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchCurrentSemester(); }, [fetchCurrentSemester]);

  const handleArchive = async () => {
    if (!currentSemester || !archiveName.trim()) {
      setError('Please provide a name for the archived semester'); return;
    }
    setProcessing(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error: archiveError } = await supabase.rpc('archive_semester', {
        p_user_id: user.id,
        p_semester_id: currentSemester.id,
        p_archive_name: archiveName.trim()
      });
      if (archiveError) throw archiveError;
      setStep('retention');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive semester');
    } finally {
      setProcessing(false);
    }
  };

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

      const { data: newSemester, error: createError } = await supabase
        .from('semesters')
        .insert({ user_id: user.id, name: newSemesterName.trim(), start_date: startDate, end_date: endDate, is_active: true })
        .select().single();
      if (createError) throw createError;

      if (retainData && currentSemester) {
        const { error: cloneError } = await supabase.rpc('clone_semester_data', {
          p_user_id: user.id,
          p_from_semester_id: currentSemester.id,
          p_to_semester_id: newSemester.id
        });
        if (cloneError) {
          console.error('Clone error:', cloneError);
          setError('Semester created but data cloning failed. You can add subjects manually.');
        }
      }
      router.push('/dashboard?semester_reset=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create new semester');
    } finally {
      setProcessing(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === step);
  const currentStepMeta = STEPS[currentStepIndex];

  // ── Loading State ──
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

  // ── No Active Semester ──
  if (!currentSemester) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="border-[3px] border-black bg-white dark:bg-slate-800 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] max-w-md w-full">
          <div className="w-12 h-12 bg-yellow-400 border-[3px] border-black dark:border-white flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-black dark:text-white mb-3">No Active Semester</h1>
          <p className="font-semibold text-gray-600 dark:text-gray-400 mb-6">
            You don&apos;t have an active semester. Please create one from the dashboard.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className={clsx(
              'w-full py-3 font-black text-base text-white flex items-center justify-center gap-2',
              'border-[3px] border-black bg-blue-500',
              'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
              'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
              'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
              'transition-all duration-150 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
            )}
          >
            <ChevronLeft size={20} /> Go to Dashboard
          </button>
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
          <p className="text-white/80 mt-2 font-semibold">Archive your current semester and start fresh</p>

          {/* Decorative stat pills */}
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="bg-white/20 border-[2px] border-white px-3 py-1 text-xs font-black text-white uppercase flex items-center gap-1.5">
              <Flame size={12} /> 4-step process
            </span>
            <span className="bg-white/20 border-[2px] border-white px-3 py-1 text-xs font-black text-white uppercase flex items-center gap-1.5">
              <Leaf size={12} /> Keeps your history
            </span>
            <span className="bg-white/20 border-[2px] border-white px-3 py-1 text-xs font-black text-white uppercase flex items-center gap-1.5">
              <Zap size={12} /> Quick setup
            </span>
          </div>
        </div>

        {/* ── PROGRESS STEPPER ── */}
        <div className="border-[3px] border-black bg-white dark:bg-slate-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-6">
          <div className="flex items-center">
            {STEPS.map(({ key, label, color, textColor }, idx) => {
              const isCurrent = key === step;
              const isDone = idx < currentStepIndex;
              return (
                <div key={key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5 min-w-[44px]">
                    <div className={clsx(
                      'w-10 h-10 border-[3px] border-black dark:border-white flex items-center justify-center font-black text-sm transition-all duration-200',
                      isCurrent ? `${color} text-white scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]`
                        : isDone ? 'bg-green-500 text-white'
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
                  {idx < STEPS.length - 1 && (
                    <div className={clsx(
                      'flex-1 h-[3px] mx-1',
                      isDone ? 'bg-green-500' : isCurrent ? `${color.replace('bg-', 'bg-').replace('-500', '-200')} dark:opacity-30` : 'bg-gray-200 dark:bg-slate-600'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ERROR DISPLAY ── */}
        {error && (
          <div className="border-[3px] border-black bg-red-400 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white flex items-start gap-3 mb-6">
            <AlertTriangle className="shrink-0 mt-0.5 text-black" size={20} />
            <p className="text-sm font-bold text-black">{error}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 1 — ARCHIVE  (Orange theme)
        ══════════════════════════════════════════ */}
        {step === 'archive' && (
          <div className={clsx(
            'border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            'bg-orange-50 dark:bg-orange-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
          )}>
            {/* Coloured step banner */}
            <div className="bg-orange-500 px-6 py-3 flex items-center gap-3 border-b-[3px] border-black dark:border-white">
              <Archive size={20} className="text-white" />
              <h2 className="text-base font-black text-white uppercase tracking-wide">Step 1 — Archive Current Semester</h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Warning box */}
              <div className="border-[3px] border-black bg-yellow-400 p-4 flex gap-3 items-start">
                <AlertTriangle className="shrink-0 mt-0.5 text-black" size={18} />
                <div>
                  <p className="font-black text-black text-sm uppercase">Warning</p>
                  <p className="text-black text-sm font-semibold mt-1">
                    This will freeze your current attendance logs. You won&apos;t be able to edit them after archiving.
                  </p>
                </div>
              </div>

              {/* Current semester display */}
              <div>
                <label className="block text-xs font-black text-orange-700 dark:text-orange-400 uppercase mb-2">
                  Current Active Semester
                </label>
                <div className="border-[3px] border-black bg-orange-200 dark:bg-orange-900/40 dark:border-white p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500 border-[2px] border-black dark:border-white flex items-center justify-center shrink-0">
                    <Archive size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black text-black dark:text-white text-lg leading-tight">{currentSemester.name}</p>
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mt-0.5">
                      {new Date(currentSemester.start_date).toLocaleDateString()} – {new Date(currentSemester.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Archive name input */}
              <div>
                <label className="block text-xs font-black text-orange-700 dark:text-orange-400 uppercase mb-2">
                  Archive Name
                </label>
                <input
                  type="text"
                  value={archiveName}
                  onChange={(e) => setArchiveName(e.target.value)}
                  className={clsx(
                    'w-full p-3 text-base font-semibold',
                    'border-[3px] border-black bg-white',
                    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                    'transition-all duration-150 placeholder:text-gray-400',
                    'dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
                  )}
                  placeholder="e.g., Fall 2025 (Archived)"
                  maxLength={100}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  disabled={processing}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
                    'transition-all duration-150 disabled:opacity-50'
                  )}
                >
                  <ChevronLeft size={18} /> Cancel
                </button>
                <button
                  onClick={handleArchive}
                  disabled={processing || !archiveName.trim()}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm text-white flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-orange-500',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
                    'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
                    'dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]'
                  )}
                >
                  {processing
                    ? <><Loader2 className="animate-spin" size={18} /> Archiving...</>
                    : <>Archive &amp; Continue <ChevronRight size={18} /></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 2 — SUBJECT RETENTION  (Purple theme)
        ══════════════════════════════════════════ */}
        {step === 'retention' && (
          <div className={clsx(
            'border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            'bg-purple-50 dark:bg-purple-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
          )}>
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
                {/* Clone option */}
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

                {/* Fresh start option */}
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
                <button
                  onClick={() => setStep('archive')}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                  )}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <button
                  onClick={() => setStep('dates')}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm text-white flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-purple-500',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150',
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
            STEP 3 — DATES  (Blue theme)
        ══════════════════════════════════════════ */}
        {step === 'dates' && (
          <div className={clsx(
            'border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            'bg-blue-50 dark:bg-blue-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
          )}>
            <div className="bg-blue-500 px-6 py-3 flex items-center gap-3 border-b-[3px] border-black dark:border-white">
              <CalendarDays size={20} className="text-white" />
              <h2 className="text-base font-black text-white uppercase tracking-wide">Step 3 — New Semester Dates</h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Semester name */}
              <div>
                <label className="block text-xs font-black text-blue-700 dark:text-blue-400 uppercase mb-2">
                  Semester Name
                </label>
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

              {/* Date grid */}
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

              {/* Duration pill */}
              {startDate && endDate && new Date(endDate) > new Date(startDate) && (
                <div className="border-[3px] border-black bg-green-400 p-4 flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-black shrink-0" />
                  <p className="font-black text-black text-sm">
                    Duration:{' '}
                    {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('retention')}
                  className={clsx(
                    'flex-1 py-3 font-black text-sm flex items-center justify-center gap-2',
                    'border-[3px] border-black bg-white dark:bg-slate-700 text-black dark:text-white',
                    'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
                    'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150'
                  )}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <button
                  onClick={() => {
                    if (!newSemesterName.trim() || !startDate || !endDate) { setError('Please fill in all fields'); return; }
                    if (new Date(startDate) >= new Date(endDate)) { setError('End date must be after start date'); return; }
                    setError(null); setStep('confirm');
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
                  Review <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 4 — CONFIRM  (Green theme)
        ══════════════════════════════════════════ */}
        {step === 'confirm' && (
          <div className={clsx(
            'border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            'bg-green-50 dark:bg-green-950/20 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
          )}>
            <div className="bg-green-500 px-6 py-3 flex items-center gap-3 border-b-[3px] border-black dark:border-white">
              <CheckCircle2 size={20} className="text-white" />
              <h2 className="text-base font-black text-white uppercase tracking-wide">Step 4 — Confirm &amp; Create</h2>
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
                    { icon: <CalendarDays size={14} className="text-blue-600 dark:text-blue-400" />, label: 'Start', value: new Date(startDate).toLocaleDateString() },
                    { icon: <CalendarDays size={14} className="text-blue-600 dark:text-blue-400" />, label: 'End', value: new Date(endDate).toLocaleDateString() },
                    { icon: <BookOpen size={14} className="text-purple-600 dark:text-purple-400" />, label: 'Subjects', value: retainData ? 'Will be cloned' : 'Fresh start' },
                  ].map(({ icon, label, value }) => (
                    <li key={label} className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white">
                      {icon}
                      <span className="text-gray-600 dark:text-gray-400 font-semibold">{label}:</span>
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
                        'Current semester will be archived (read-only)',
                        'New semester becomes active immediately',
                        retainData ? 'All subjects & timetable will be copied over' : null,
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

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('dates')}
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
        <div className={clsx(
          'mt-4 border-[3px] border-black p-3 flex items-center gap-3',
          currentStepMeta.color,
          'dark:border-white'
        )}>
          <Info size={16} className="text-white shrink-0" />
          <p className="text-xs font-bold text-white">
            {step === 'archive' && 'Your attendance history is safely preserved in the archived semester.'}
            {step === 'retention' && 'Cloning saves you from re-entering subjects — you can still edit them after creation.'}
            {step === 'dates' && 'Semester dates determine which days attendance is tracked. Choose carefully!'}
            {step === 'confirm' && 'Review everything above before creating. This action cannot be undone.'}
          </p>
        </div>

      </div>
    </div>
  );
}
