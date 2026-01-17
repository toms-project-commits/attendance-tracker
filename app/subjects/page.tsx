'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, BookOpen } from 'lucide-react';
import Link from 'next/link';

// Define what a "Subject" looks like
type Subject = {
  id: string;
  name: string;
  target_percentage: number;
  color_hex: string;
};

// Simple colors to pick from
const COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export default function SubjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState(75);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

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

  // 2. ADD NEW SUBJECT
  const handleAddSubject = async (e: React.FormEvent) => {
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

      setNewName(''); // Clear form
      fetchSubjects(); // Refresh list
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Failed to add subject. Please try again.');
    }
  };

  // 3. DELETE SUBJECT
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

      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Manage Subjects</h1>
        </div>

        {/* ADD NEW SUBJECT FORM */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Plus size={20} className="text-blue-600" /> Add New Subject
            </h2>
            <p className="text-xs text-slate-500">Set a target attendance percentage for each subject to track your progress.</p>
          </div>
          
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Psychology 101"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              {/* Target % Input */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Attendance %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-20 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTarget}
                    onChange={(e) => setNewTarget(Number(e.target.value))}
                  />
                  <span className="text-slate-500 text-sm">%</span>
                </div>
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Color Code</label>
              <div className="flex gap-3">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform ${selectedColor === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-300' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                    aria-pressed={selectedColor === color}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!newName}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Subject
            </button>
          </form>
        </div>

        {/* SUBJECTS LIST */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Your Classes</h2>
          
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : subjects.length === 0 ? (
            <div className="text-center p-12 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl border border-dashed border-slate-200">
              <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto mb-4">
                <BookOpen className="text-blue-600 mx-auto" size={32} />
              </div>
              <p className="text-slate-700 font-bold text-lg">No subjects added yet</p>
              <p className="text-slate-500 text-sm mt-2">Create your first subject to start tracking attendance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {subjects.map((sub) => (
                <div key={sub.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-12 rounded-full" style={{ backgroundColor: sub.color_hex }}></div>
                    <div>
                      <h3 className="font-bold text-slate-800">{sub.name}</h3>
                      <p className="text-xs text-slate-400">Target: {sub.target_percentage}%</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label={`Delete ${sub.name}`}
                    title="Delete Subject"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
