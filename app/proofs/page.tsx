'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Calendar, BookOpen, X, Loader2, FolderOpen, Clock } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { getProofsBySubject } from '@/lib/persistentProofStorage';
import { format } from 'date-fns';

interface ProofWithMetadata {
  id: string;
  userId: string;
  date: string;
  subjectId: string;
  subjectName: string;
  timestamp: number;
  filename: string;
  dataUrl: string;
}

interface Subject {
  id: string;
  name: string;
  color_hex: string;
}

// Default color for orphaned proofs (where subject was deleted)
const ORPHANED_SUBJECT_COLOR = '#6b7280'; // gray-500

export default function ProofsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [proofsBySubject, setProofsBySubject] = useState<Record<string, ProofWithMetadata[]>>({});
  const [selectedProof, setSelectedProof] = useState<ProofWithMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'subject' | 'date'>('subject');

  const loadProofs = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[PROOFS PAGE] Starting to load proofs...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[PROOFS PAGE] No user found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('[PROOFS PAGE] User found:', user.id);

      // Load subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, color_hex')
        .eq('user_id', user.id)
        .order('name');

      console.log('[PROOFS PAGE] Subjects loaded:', subjectsData?.length || 0);
      setSubjects(subjectsData || []);

      // Load proofs from persistent storage
      console.log('[PROOFS PAGE] Calling getProofsBySubject...');
      const proofs = await getProofsBySubject(user.id);
      console.log('[PROOFS PAGE] Proofs loaded:', Object.keys(proofs).length, 'subjects with proofs');
      console.log('[PROOFS PAGE] Proof details:', proofs);
      setProofsBySubject(proofs);
    } catch (error) {
      console.error('[PROOFS PAGE ERROR] Error loading proofs:', error);
      console.error('[PROOFS PAGE ERROR] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProofs();
  }, [loadProofs]);

  const getSubjectInfo = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId);
  };

  const getTotalProofsCount = () => {
    return Object.values(proofsBySubject).reduce((sum, proofs) => sum + proofs.length, 0);
  };

  // B-13: By-date view — group all proofs by calendar date, sorted newest first
  const renderByDateView = () => {
    const byDate = new Map<string, ProofWithMetadata[]>();
    Object.values(proofsBySubject).flat().forEach(proof => {
      const dateKey = format(new Date(proof.timestamp), 'yyyy-MM-dd');
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(proof);
    });
    const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

    if (sortedDates.length === 0) {
      return (
        <div className="border-[3px] border-black border-dashed bg-white dark:bg-slate-800 p-8 text-center dark:border-white">
          <p className="font-bold text-gray-600 dark:text-gray-400">No proofs stored yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sortedDates.map(dateKey => {
          const proofs = byDate.get(dateKey)!;
          return (
            <div
              key={dateKey}
              className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-12 border-[2px] border-black dark:border-white bg-blue-500" />
                <div>
                  <h3 className="font-black text-lg text-black dark:text-white">
                    {format(new Date(dateKey), 'EEEE, dd MMM yyyy')}
                  </h3>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                    {proofs.length} proof{proofs.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {proofs.map(proof => (
                  <button
                    key={proof.id}
                    onClick={() => setSelectedProof(proof)}
                    className={clsx(
                      "relative border-[3px] border-black overflow-hidden text-left",
                      "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                      "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                      "transition-all duration-150",
                      "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                    )}
                  >
                    <img
                      src={proof.dataUrl}
                      alt={`Proof for ${proof.subjectName}`}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2 bg-black/80">
                      <p className="text-xs font-bold text-white truncate">{proof.subjectName}</p>
                      <p className="text-xs text-white/70">{format(new Date(proof.timestamp), 'HH:mm')}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--background)' }}>
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b-[3px] border-black dark:border-white p-4 sticky top-0 z-40 shadow-[0_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[0_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="max-w-4xl mx-auto">
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
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-black text-black dark:text-white flex items-center gap-2">
                <ImageIcon size={28} />
                Attendance Proofs
              </h1>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {getTotalProofsCount()} proofs stored locally on device
              </p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setViewMode('subject')}
              className={clsx(
                "flex-1 py-2 px-4 font-black text-sm border-[3px] border-black",
                "transition-all duration-150",
                "dark:border-white",
                viewMode === 'subject'
                  ? "bg-blue-500 text-white shadow-none translate-x-[2px] translate-y-[2px]"
                  : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-700 dark:text-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              <BookOpen size={16} className="inline mr-2" />
              By Subject
            </button>
            <button
              onClick={() => setViewMode('date')}
              className={clsx(
                "flex-1 py-2 px-4 font-black text-sm border-[3px] border-black",
                "transition-all duration-150",
                "dark:border-white",
                viewMode === 'date'
                  ? "bg-blue-500 text-white shadow-none translate-x-[2px] translate-y-[2px]"
                  : "bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-700 dark:text-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              <Calendar size={16} className="inline mr-2" />
              By Date
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="border-[3px] border-black bg-yellow-400 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
              <Loader2 className="animate-spin mx-auto mb-2 text-black" size={32} />
              <p className="font-bold text-black">Loading proofs...</p>
            </div>
          </div>
        ) : getTotalProofsCount() === 0 ? (
          <div className="border-[3px] border-black border-dashed bg-white p-12 text-center dark:bg-slate-800 dark:border-white">
            <div className="w-20 h-20 bg-blue-500 border-[3px] border-black dark:border-white mx-auto mb-4 flex items-center justify-center">
              <FolderOpen className="text-white" size={40} />
            </div>
            <p className="text-xl font-black text-black dark:text-white">No Proofs Yet</p>
            <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-2">
              Capture your first proof from the Mark Attendance page
            </p>
            <Link
              href="/mark"
              className={clsx(
                "mt-6 inline-block py-3 px-6 font-black text-base text-white",
                "border-[3px] border-black bg-blue-500",
                "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                "transition-all duration-150",
                "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              )}
            >
              Mark Attendance
            </Link>
          </div>
        ) : viewMode === 'subject' ? (
          // BY SUBJECT VIEW
          Object.entries(proofsBySubject).map(([subjectId, proofs]) => {
            // Skip empty proof arrays
            if (proofs.length === 0) return null;
            
            // Get subject info - may be undefined if subject was deleted
            const subject = getSubjectInfo(subjectId);
            
            // Use subject info if available, otherwise use stored proof metadata or defaults
            const subjectName = subject?.name || proofs[0]?.subjectName || 'Deleted Subject';
            const subjectColor = subject?.color_hex || ORPHANED_SUBJECT_COLOR;
            const isOrphaned = !subject;

            return (
              <div
                key={subjectId}
                className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-4 h-12 border-[2px] border-black dark:border-white"
                    style={{ backgroundColor: subjectColor }}
                  />
                  <div className="flex-1">
                    <h3 className="font-black text-lg text-black dark:text-white flex items-center gap-2">
                      {subjectName}
                      {isOrphaned && (
                        <span className="text-xs font-bold bg-gray-500 text-white px-2 py-0.5 border-[1px] border-black dark:border-white">
                          DELETED
                        </span>
                      )}
                    </h3>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      {proofs.length} proof{proofs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {proofs.map((proof) => (
                    <button
                      key={proof.id}
                      onClick={() => setSelectedProof(proof)}
                      className={clsx(
                        "relative border-[3px] border-black bg-gray-100 overflow-hidden",
                        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                        "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                        "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                        "transition-all duration-150",
                        "dark:border-white dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                      )}
                    >
                      <img
                        src={proof.dataUrl}
                        alt={`Proof for ${subjectName}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-2 bg-black/80 text-white">
                        <p className="text-xs font-bold flex items-center gap-1">
                          <Clock size={12} />
                          {format(new Date(proof.timestamp), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // BY DATE VIEW — rendered by renderByDateView()
          renderByDateView()
        )}
      </div>

      {/* PROOF VIEWER MODAL */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProof(null)}>
          <div className="border-[3px] border-white bg-slate-900 w-full max-w-4xl shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b-[3px] border-white p-4 flex items-center justify-between bg-blue-500">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <ImageIcon size={24} />
                  Attendance Proof
                </h3>
                <p className="text-sm font-semibold text-white/90">
                  {selectedProof.subjectName} • {format(new Date(selectedProof.timestamp), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-2 border-[2px] border-white bg-red-500 text-white hover:bg-red-600 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedProof.dataUrl}
                alt="Attendance proof"
                className="w-full h-auto border-[2px] border-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
