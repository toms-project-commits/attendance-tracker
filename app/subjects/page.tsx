'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, BookOpen, Edit2, Check } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

// Define what a "Subject" looks like
type Subject = {
  id: string;
  name: string;
  target_percentage: number;
  color_hex: string;
};

// Simple colors to pick from - vibrant flat colors
const COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Deep Orange
];

export default function SubjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState(75);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. FETCH SUBJECTS ON LOAD
  useEffect(() => {
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching subjects:', error);
      } else if (data) {
        setSubjects(data);
      }
    } catch (error) {
      console.error('Unexpected error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. ADD OR UPDATE SUBJECT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Please enter a subject name');
      return;
    }

    if (newTarget < 0 || newTarget > 100) {
      alert('Target percentage must be between 0 and 100');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      if (editingId) {
        // UPDATE existing subject
        const { error } = await supabase
          .from('subjects')
          .update({
            name: newName.trim(),
            target_percentage: newTarget,
            color_hex: selectedColor,
          })
          .eq('id', editingId);

        if (error) {
          throw error;
        }
      } else {
        // INSERT new subject
        const { error } = await supabase
          .from('subjects')
          .insert({
            user_id: user.id,
            name: newName.trim(),
            target_percentage: newTarget,
            color_hex: selectedColor,
          });

        if (error) {
          throw error;
        }
      }

      // Clear form and reset edit mode
      setNewName('');
      setNewTarget(75);
      setSelectedColor(COLORS[0]);
      setEditingId(null);
      fetchSubjects(); // Refresh list
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject. Please try again.');
    }
  };

  // 3. START EDITING
  const handleEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setNewName(subject.name);
    setNewTarget(subject.target_percentage);
    setSelectedColor(subject.color_hex);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 4. CANCEL EDITING
  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName('');
    setNewTarget(75);
    setSelectedColor(COLORS[0]);
  };

  // 5. DELETE SUBJECT
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete all attendance data for this subject.")) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // If we're editing this subject, cancel edit mode
      if (editingId === id) {
        handleCancelEdit();
      }

      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject. Please try again.');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className={clsx(
              "p-3 border-[3px] border-black bg-white",
              "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
              "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
              "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
              "transition-all duration-150",
              "dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
              "dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
            )}
          >
            <ArrowLeft size={20} className="text-black dark:text-white" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white">📚 Manage Subjects</h1>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Add and organize your classes</p>
          </div>
        </div>

        {/* ADD/EDIT SUBJECT FORM */}
        <div 
          className={clsx(
            "border-[3px] border-black bg-white p-6",
            "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
            "dark:bg-slate-800 dark:border-white dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]",
            editingId && "bg-blue-50 dark:bg-blue-900/20"
          )}
        >
          <div className="mb-6">
            <h2 className="text-xl font-black text-black dark:text-white flex items-center gap-2">
              {editingId ? (
                <>
                  <div className="w-8 h-8 bg-blue-500 border-[2px] border-black dark:border-white flex items-center justify-center">
                    <Edit2 size={16} className="text-white" />
                  </div>
                  Edit Subject
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-green-500 border-[2px] border-black dark:border-white flex items-center justify-center">
                    <Plus size={16} className="text-white" />
                  </div>
                  Add New Subject
                </>
              )}
            </h2>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-1">
              Set a target attendance percentage for each subject to track your progress.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-2">
                  Subject Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Psychology 101"
                  className={clsx(
                    "w-full p-3 text-base font-semibold",
                    "border-[3px] border-black bg-white",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]",
                    "transition-all duration-150",
                    "placeholder:text-gray-400",
                    "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
                  )}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              {/* Target % Input */}
              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-2">
                  Target Attendance %
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={clsx(
                      "w-24 p-3 text-base font-bold text-center",
                      "border-[3px] border-black bg-white",
                      "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      "focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]",
                      "transition-all duration-150",
                      "dark:bg-slate-700 dark:text-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                      "dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
                    )}
                    value={newTarget}
                    onChange={(e) => setNewTarget(Number(e.target.value))}
                  />
                  <span className="text-lg font-black text-black dark:text-white">%</span>
                </div>
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-black text-black dark:text-white uppercase tracking-wider mb-3">
                Color Code
              </label>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={clsx(
                      "w-10 h-10 border-[3px] border-black transition-all duration-150",
                      "dark:border-white",
                      selectedColor === color 
                        ? "scale-110 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]" 
                        : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                    aria-pressed={selectedColor === color}
                  >
                    {selectedColor === color && (
                      <Check size={20} className="text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className={clsx(
                    "flex-1 py-3 px-6 font-bold text-base",
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
              )}
              <button
                type="submit"
                disabled={!newName}
                className={clsx(
                  "flex-1 py-3 px-6 font-black text-base text-white",
                  "border-[3px] border-black",
                  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  "hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                  "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
                  "transition-all duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0",
                  "dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                  editingId ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"
                )}
              >
                {editingId ? '✏️ Update Subject' : '➕ Add Subject'}
              </button>
            </div>
          </form>
        </div>

        {/* SUBJECTS LIST */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-black dark:text-white"> Your Classes ({subjects.length})</h2>
          
          {loading ? (
            <div className="border-[3px] border-black bg-yellow-400 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white">
              <p className="text-black font-bold"> Loading your subjects...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="border-[3px] border-black border-dashed bg-white p-8 text-center dark:bg-slate-800 dark:border-white">
              <div className="w-16 h-16 bg-blue-500 border-[3px] border-black dark:border-white mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="text-white" size={32} />
              </div>
              <p className="text-xl font-black text-black dark:text-white">No subjects added yet</p>
              <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-2">
                Create your first subject above to start tracking attendance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {subjects.map((sub) => (
                <div 
                  key={sub.id} 
                  className={clsx(
                    "border-[3px] border-black bg-white p-4",
                    "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    "transition-all duration-200",
                    "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]",
                    "dark:bg-slate-800 dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]",
                    "dark:hover:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)]",
                    editingId === sub.id && "ring-4 ring-blue-500"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Color indicator */}
                      <div 
                        className="w-4 h-16 border-[2px] border-black dark:border-white" 
                        style={{ backgroundColor: sub.color_hex }}
                      />
                      <div>
                        <h3 className="font-black text-lg text-black dark:text-white">{sub.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Target:</span>
                          <span 
                            className="px-2 py-0.5 text-sm font-black border-[2px] border-black dark:border-white text-white"
                            style={{ backgroundColor: sub.color_hex }}
                          >
                            {sub.target_percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(sub)}
                        className={clsx(
                          "p-3 border-[2px] border-black bg-blue-100",
                          "hover:bg-blue-500 hover:text-white",
                          "transition-all duration-150",
                          "dark:bg-blue-900/30 dark:border-white dark:hover:bg-blue-500"
                        )}
                        aria-label={`Edit ${sub.name}`}
                        title="Edit Subject"
                      >
                        <Edit2 size={18} className="text-current" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className={clsx(
                          "p-3 border-[2px] border-black bg-red-100",
                          "hover:bg-red-500 hover:text-white",
                          "transition-all duration-150",
                          "dark:bg-red-900/30 dark:border-white dark:hover:bg-red-500"
                        )}
                        aria-label={`Delete ${sub.name}`}
                        title="Delete Subject"
                      >
                        <Trash2 size={18} className="text-current" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
