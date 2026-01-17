'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // This connects to your database
import { Loader2, ArrowLeft } from 'lucide-react'; // Icons
import Link from 'next/link'; // For linking pages

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // This sends the reset email using Supabase
    // SSR-safe window access
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/update-password`,
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: "Check your email for the password reset link.", type: 'success' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        {/* Back Button */}
        <Link href="/login" className="flex items-center text-slate-400 hover:text-slate-600 mb-6 text-sm">
          <ArrowLeft size={16} className="mr-1" /> Back to Login
        </Link>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h1>
        <p className="text-slate-500 text-sm mb-6">Enter your email to receive recovery instructions.</p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="student@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Error/Success Message Box */}
          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
}