'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  LogOut, 
  BookOpen, 
  Calendar, 
  PieChart, 
  CheckCircle, 
  ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  // 1. AUTH CHECK
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
        } else {
          // Use the part before '@' as the name, or default to 'Student'
          setUserName(user.email?.split('@')[0] || 'Student');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/login');
      }
    };
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // 2. LOGOUT FUNCTION
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      router.push('/login');
    } catch (error) {
      console.error('Unexpected error signing out:', error);
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 bg-slate-50">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* TOP NAVIGATION */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          🎓 Student Tracker
        </h1>
        <button 
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-2 transition-colors font-medium"
          aria-label="Sign out"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* WELCOME BANNER */}
        <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-lg shadow-blue-200">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h2>
          <p className="text-blue-100 text-lg">Your semester is set up. Ready to crush your goals?</p>
        </div>

        {/* HERO ACTION: MARK ATTENDANCE */}
        <Link href="/mark" className="block transform transition-transform hover:scale-[1.01]" aria-label="Mark today's attendance">
          <div className="bg-slate-900 hover:bg-slate-800 transition-colors p-6 md:p-8 rounded-3xl shadow-xl flex items-center justify-between group cursor-pointer border border-slate-800">
             <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 group-hover:text-white group-hover:bg-blue-600 transition-all shadow-inner" aria-hidden="true">
                 <CheckCircle size={32} />
               </div>
               <div>
                 <h3 className="text-white font-bold text-xl mb-1">Mark Today's Attendance</h3>
                 <p className="text-slate-400 text-base group-hover:text-slate-300 transition-colors">
                   Tap here to log your classes for today.
                 </p>
               </div>
             </div>
             <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={28} aria-hidden="true" />
          </div>
        </Link>

        {/* MANAGEMENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Subjects */}
          <Link href="/subjects">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group h-full">
              <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BookOpen size={28} />
              </div>
              <h3 className="font-bold text-slate-800 text-xl mb-2">Subjects</h3>
              <p className="text-slate-500 leading-relaxed">
                Add your classes and set your target percentage goals.
              </p>
            </div>
          </Link>

          {/* Card 2: Timetable */}
          <Link href="/timetable">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-purple-100 transition-all cursor-pointer group h-full">
              <div className="h-14 w-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Calendar size={28} />
              </div>
              <h3 className="font-bold text-slate-800 text-xl mb-2">Timetable</h3>
              <p className="text-slate-500 leading-relaxed">
                Set your weekly schedule and manage class timings.
              </p>
            </div>
          </Link>

          {/* Card 3: Analytics */}
          <Link href="/analytics">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-green-100 transition-all cursor-pointer group h-full">
              <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-5 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <PieChart size={28} />
              </div>
              <h3 className="font-bold text-slate-800 text-xl mb-2">Analytics</h3>
              <p className="text-slate-500 leading-relaxed">
                Check your detailed stats and see how many classes you can skip.
              </p>
            </div>
          </Link>

        </div>
      </main>
    </div>
  );
}