'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Semester = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type Step = 'archive' | 'retention' | 'dates' | 'confirm';

export default function NewSemesterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('archive');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [archiveName, setArchiveName] = useState('');
  const [retainData, setRetainData] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newSemesterName, setNewSemesterName] = useState('');

  useEffect(() => {
    fetchCurrentSemester();
  }, []);

  const fetchCurrentSemester = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

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
      console.error('Error fetching semester:', err);
      setError(err instanceof Error ? err.message : 'Failed to load semester data');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!currentSemester || !archiveName.trim()) {
      setError('Please provide a name for the archived semester');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call the archive function
      const { error: archiveError } = await supabase.rpc('archive_semester', {
        p_user_id: user.id,
        p_semester_id: currentSemester.id,
        p_archive_name: archiveName.trim()
      });

      if (archiveError) throw archiveError;

      setStep('retention');
    } catch (err) {
      console.error('Archive error:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive semester');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateSemester = async () => {
    if (!newSemesterName.trim() || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create new semester
      const { data: newSemester, error: createError } = await supabase
        .from('semesters')
        .insert({
          user_id: user.id,
          name: newSemesterName.trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: true
        })
        .select()
        .single();

      if (createError) throw createError;

      // Clone data if requested
      if (retainData && currentSemester) {
        const { error: cloneError } = await supabase.rpc('clone_semester_data', {
          p_user_id: user.id,
          p_from_semester_id: currentSemester.id,
          p_to_semester_id: newSemester.id
        });

        if (cloneError) {
          console.error('Clone error:', cloneError);
          // Don't fail the whole operation if clone fails
          setError('Semester created but data cloning failed. You can add subjects manually.');
        }
      }

      // Success! Redirect to dashboard
      router.push('/dashboard?semester_reset=success');
    } catch (err) {
      console.error('Create semester error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new semester');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="animate-pulse text-center">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSemester) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
          <h1 className="text-2xl font-black mb-4">No Active Semester</h1>
          <p className="mb-6">You don&apos;t have an active semester. Please create one from the dashboard.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-blue-400 hover:bg-blue-500 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-3xl mx-auto py-8">
        {/* Header */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
          <h1 className="text-3xl font-black mb-2">🎓 New Semester Setup</h1>
          <p className="text-gray-700">Archive your current semester and start fresh</p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 mb-6">
          <div className="flex justify-between items-center">
            {(['archive', 'retention', 'dates', 'confirm'] as Step[]).map((s, idx) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full border-4 border-black flex items-center justify-center font-black ${
                    s === step
                      ? 'bg-yellow-400'
                      : step === 'confirm' || (['archive', 'retention', 'dates'].indexOf(step) > idx)
                      ? 'bg-green-400'
                      : 'bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step === 'confirm' || (['archive', 'retention', 'dates'].indexOf(step) > idx)
                        ? 'bg-black'
                        : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-bold">
            <span>Archive</span>
            <span>Retention</span>
            <span>Dates</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-4 border-black p-4 mb-6">
            <p className="text-red-800 font-bold">⚠️ {error}</p>
          </div>
        )}

        {/* Step 1: Archive Current */}
        {step === 'archive' && (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <h2 className="text-2xl font-black mb-4">📦 Archive Current Semester</h2>
            
            <div className="bg-yellow-100 border-4 border-black p-4 mb-6">
              <p className="font-bold text-yellow-900">⚠️ WARNING</p>
              <p className="text-yellow-900 text-sm mt-2">
                This will freeze your current attendance logs. You won&apos;t be able to edit them after archiving.
              </p>
            </div>

            <div className="mb-6">
              <label className="block font-bold mb-2">Current Semester:</label>
              <div className="bg-gray-100 border-4 border-black p-4">
                <p className="font-bold text-lg">{currentSemester.name}</p>
                <p className="text-sm text-gray-600">
                  {new Date(currentSemester.start_date).toLocaleDateString()} - {new Date(currentSemester.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block font-bold mb-2">Archive Name:</label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                className="w-full p-3 border-4 border-black text-lg font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                placeholder="e.g., Fall 2025 (Archived)"
                maxLength={100}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={processing || !archiveName.trim()}
                className="flex-1 bg-purple-400 hover:bg-purple-500 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Archiving...' : 'Archive & Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Subject Retention */}
        {step === 'retention' && (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <h2 className="text-2xl font-black mb-4">📚 Subject Retention</h2>
            
            <p className="mb-6 text-gray-700">
              Do you want to retain your current subjects and timetable for the new semester?
            </p>

            <div className="space-y-4 mb-6">
              <button
                onClick={() => setRetainData(true)}
                className={`w-full p-6 border-4 border-black text-left transition-all ${
                  retainData
                    ? 'bg-green-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-4 border-black mr-4 flex items-center justify-center ${
                      retainData ? 'bg-black' : 'bg-white'
                    }`}
                  >
                    {retainData && <span className="text-white font-black">✓</span>}
                  </div>
                  <div>
                    <p className="font-black text-lg">✅ Yes, Clone My Data</p>
                    <p className="text-sm text-gray-600">
                      Copy all subjects and timetable slots to the new semester
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setRetainData(false)}
                className={`w-full p-6 border-4 border-black text-left transition-all ${
                  !retainData
                    ? 'bg-blue-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full border-4 border-black mr-4 flex items-center justify-center ${
                      !retainData ? 'bg-black' : 'bg-white'
                    }`}
                  >
                    {!retainData && <span className="text-white font-black">✓</span>}
                  </div>
                  <div>
                    <p className="font-black text-lg">🆕 No, Start Fresh</p>
                    <p className="text-sm text-gray-600">
                      Begin with a clean slate (you&apos;ll add subjects manually)
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('archive')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setStep('dates')}
                className="flex-1 bg-purple-400 hover:bg-purple-500 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: New Dates */}
        {step === 'dates' && (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <h2 className="text-2xl font-black mb-4">📅 New Semester Dates</h2>
            
            <div className="space-y-6 mb-6">
              <div>
                <label className="block font-bold mb-2">Semester Name:</label>
                <input
                  type="text"
                  value={newSemesterName}
                  onChange={(e) => setNewSemesterName(e.target.value)}
                  className="w-full p-3 border-4 border-black text-lg font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                  placeholder="e.g., Spring 2026"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block font-bold mb-2">Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 border-4 border-black text-lg font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block font-bold mb-2">End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 border-4 border-black text-lg font-bold focus:outline-none focus:ring-4 focus:ring-yellow-400"
                />
              </div>

              {startDate && endDate && new Date(endDate) > new Date(startDate) && (
                <div className="bg-green-100 border-4 border-black p-4">
                  <p className="font-bold text-green-800">
                    ✓ Duration: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('retention')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!newSemesterName.trim() || !startDate || !endDate}
                className="flex-1 bg-purple-400 hover:bg-purple-500 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
            <h2 className="text-2xl font-black mb-4">✅ Confirm New Semester</h2>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-100 border-4 border-black p-4">
                <p className="font-bold mb-2">New Semester Details:</p>
                <ul className="space-y-1 text-sm">
                  <li>📝 Name: <span className="font-bold">{newSemesterName}</span></li>
                  <li>📅 Start: <span className="font-bold">{new Date(startDate).toLocaleDateString()}</span></li>
                  <li>📅 End: <span className="font-bold">{new Date(endDate).toLocaleDateString()}</span></li>
                  <li>
                    📚 Subjects: <span className="font-bold">{retainData ? 'Will be cloned' : 'Start fresh'}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-100 border-4 border-black p-4">
                <p className="font-bold text-blue-900">ℹ️ What happens next?</p>
                <ul className="text-sm text-blue-900 mt-2 space-y-1">
                  <li>✓ Current semester will be archived</li>
                  <li>✓ New semester becomes active</li>
                  {retainData && <li>✓ Subjects and timetable will be copied</li>}
                  <li>✓ Attendance logs remain with archived semester</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('dates')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                disabled={processing}
              >
                Back
              </button>
              <button
                onClick={handleCreateSemester}
                disabled={processing}
                className="flex-1 bg-green-400 hover:bg-green-500 text-black font-bold py-3 px-6 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? '⏳ Creating...' : '🚀 Create New Semester'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
