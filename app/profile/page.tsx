'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import {
  getUserProfile,
  updateProfileIdentity,
  updateUserEmail,
  updateUserPassword,
  getInitials,
  type Profile,
} from '@/lib/utils/profile';
import {
  profileIdentitySchema,
  emailUpdateSchema,
  passwordUpdateSchema,
  type ProfileIdentityData,
  type EmailUpdateData,
  type PasswordUpdateData,
} from '@/lib/validations/profile';
import { Loader2, User, Mail, Lock, Save, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

type ToastType = 'success' | 'error';

interface Toast {
  message: string;
  type: ToastType;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form for Identity (Username + Full Name)
  const identityForm = useForm<ProfileIdentityData>({
    resolver: zodResolver(profileIdentitySchema),
    defaultValues: {
      username: '',
      full_name: '',
    },
  });

  // Form for Email Update
  const emailForm = useForm<EmailUpdateData>({
    resolver: zodResolver(emailUpdateSchema),
    defaultValues: {
      email: '',
    },
  });

  // Form for Password Update
  const passwordForm = useForm<PasswordUpdateData>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Show toast notification
  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Load user profile and auth data
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          router.push('/login');
          return;
        }

        setUserEmail(user.email || '');
        emailForm.setValue('email', user.email || '');

        const profileData = await getUserProfile();
        if (cancelled) return;

        if (profileData) {
          setProfile(profileData);
          identityForm.setValue('username', profileData.username || '');
          identityForm.setValue('full_name', profileData.full_name || '');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Handle Identity Update
  const handleIdentityUpdate = async (data: ProfileIdentityData) => {
    try {
      const updatedProfile = await updateProfileIdentity(data);
      setProfile(updatedProfile);
      showToast('✅ Profile updated successfully!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      showToast(`❌ ${errorMessage}`, 'error');
    }
  };

  // Handle Email Update
  const handleEmailUpdate = async (data: EmailUpdateData) => {
    try {
      await updateUserEmail(data.email);
      setUserEmail(data.email);
      showToast('✅ Email updated! Please check your inbox to confirm.', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update email';
      showToast(`❌ ${errorMessage}`, 'error');
    }
  };

  // Handle Password Update
  const handlePasswordUpdate = async (data: PasswordUpdateData) => {
    try {
      await updateUserPassword(data.currentPassword, data.newPassword);
      passwordForm.reset();
      showToast('✅ Password updated successfully!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
      showToast(`❌ ${errorMessage}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <Loader2 className="w-12 h-12 animate-spin text-black dark:text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-black dark:text-white font-bold hover:text-blue-500 dark:hover:text-blue-400 transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          
          <div className="border-[3px] border-black dark:border-white bg-blue-500 px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
            <h1 className="text-3xl md:text-4xl font-black text-white">User Profile</h1>
            <p className="text-white font-bold mt-1 opacity-90">Manage your personal information and account settings</p>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={clsx(
              'mb-6 border-[3px] border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
              toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'
            )}
          >
            <p className="font-bold text-black">{toast.message}</p>
          </div>
        )}

        {/* Identity Module */}
        <div className="mb-8 border-[3px] border-black dark:border-white bg-white dark:bg-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
          <div className="border-b-[3px] border-black dark:border-white bg-yellow-400 px-6 py-4">
            <h2 className="text-2xl font-black text-black flex items-center gap-2">
              <User size={24} />
              Identity
            </h2>
          </div>

          <div className="p-6">
            {/* Profile Picture Placeholder */}
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 border-[4px] border-black dark:border-white bg-gradient-to-br from-blue-400 to-purple-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center">
                <span className="text-4xl font-black text-white">
                  {getInitials(profile?.full_name || null)}
                </span>
              </div>
            </div>

            <form onSubmit={identityForm.handleSubmit(handleIdentityUpdate)} className="space-y-5">
              {/* Full Name Field */}
              <div>
                <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  {...identityForm.register('full_name')}
                  className={clsx(
                    'w-full px-4 py-3 text-base font-semibold',
                    'border-[3px] border-black dark:border-white bg-white dark:bg-slate-700',
                    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                    'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                    'transition-all duration-150',
                    'placeholder:text-gray-400 dark:text-white',
                    identityForm.formState.errors.full_name && 'border-red-500'
                  )}
                  placeholder="John Doe"
                />
                {identityForm.formState.errors.full_name && (
                  <p className="mt-2 text-sm font-bold text-red-600">
                    {identityForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              {/* Username Field */}
              <div>
                <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  {...identityForm.register('username')}
                  className={clsx(
                    'w-full px-4 py-3 text-base font-semibold',
                    'border-[3px] border-black dark:border-white bg-white dark:bg-slate-700',
                    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                    'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                    'transition-all duration-150',
                    'placeholder:text-gray-400 dark:text-white',
                    identityForm.formState.errors.username && 'border-red-500'
                  )}
                  placeholder="johndoe123"
                />
                {identityForm.formState.errors.username && (
                  <p className="mt-2 text-sm font-bold text-red-600">
                    {identityForm.formState.errors.username.message}
                  </p>
                )}
                <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  3-20 characters, lowercase letters, numbers, and underscores only
                </p>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={identityForm.formState.isSubmitting}
                className={clsx(
                  'w-full py-4 text-lg font-black text-white',
                  'border-[3px] border-black dark:border-white bg-blue-500',
                  'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                  'transition-all duration-150',
                  'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                  'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0',
                  'flex items-center justify-center gap-2'
                )}
              >
                {identityForm.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <Save size={20} />
                    Save Identity
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Account Management Section */}
        <div className="space-y-8">
          {/* Email Update */}
          <div className="border-[3px] border-black dark:border-white bg-white dark:bg-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
            <div className="border-b-[3px] border-black dark:border-white bg-green-400 px-6 py-4">
              <h2 className="text-2xl font-black text-black flex items-center gap-2">
                <Mail size={24} />
                Change Email
              </h2>
            </div>

            <div className="p-6">
              <form onSubmit={emailForm.handleSubmit(handleEmailUpdate)} className="space-y-5">
                <div>
                  <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    {...emailForm.register('email')}
                    className={clsx(
                      'w-full px-4 py-3 text-base font-semibold',
                      'border-[3px] border-black dark:border-white bg-white dark:bg-slate-700',
                      'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                      'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                      'transition-all duration-150',
                      'placeholder:text-gray-400 dark:text-white',
                      emailForm.formState.errors.email && 'border-red-500'
                    )}
                    placeholder="newemail@example.com"
                  />
                  {emailForm.formState.errors.email && (
                    <p className="mt-2 text-sm font-bold text-red-600">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Current: {userEmail}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={emailForm.formState.isSubmitting}
                  className={clsx(
                    'w-full py-4 text-lg font-black text-white',
                    'border-[3px] border-black dark:border-white bg-green-500',
                    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                    'transition-all duration-150',
                    'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                    'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {emailForm.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      <Save size={20} />
                      Update Email
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Password Update */}
          <div className="border-[3px] border-black dark:border-white bg-white dark:bg-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
            <div className="border-b-[3px] border-black dark:border-white bg-orange-400 px-6 py-4">
              <h2 className="text-2xl font-black text-black flex items-center gap-2">
                <Lock size={24} />
                Change Password
              </h2>
            </div>

            <div className="p-6">
              <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-5">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      {...passwordForm.register('currentPassword')}
                      className={clsx(
                        'w-full px-4 py-3 pr-12 text-base font-semibold',
                        'border-[3px] border-black dark:border-white bg-white dark:bg-slate-700',
                        'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                        'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                        'transition-all duration-150',
                        'placeholder:text-gray-400 dark:text-white',
                        passwordForm.formState.errors.currentPassword && 'border-red-500'
                      )}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="mt-2 text-sm font-bold text-red-600">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      {...passwordForm.register('newPassword')}
                      className={clsx(
                        'w-full px-4 py-3 pr-12 text-base font-semibold',
                        'border-[3px] border-black dark:border-white bg-white dark:bg-slate-700',
                        'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                        'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                        'transition-all duration-150',
                        'placeholder:text-gray-400 dark:text-white',
                        passwordForm.formState.errors.newPassword && 'border-red-500'
                      )}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="mt-2 text-sm font-bold text-red-600">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-black text-black dark:text-white mb-2 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...passwordForm.register('confirmPassword')}
                      className={clsx(
                        'w-full px-4 py-3 pr-12 text-base font-semibold',
                        'border-[3px] border-black dark:border-white bg-white dark:bg-slate-700',
                        'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                        'focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] focus:-translate-x-[1px] focus:-translate-y-[1px]',
                        'transition-all duration-150',
                        'placeholder:text-gray-400 dark:text-white',
                        passwordForm.formState.errors.confirmPassword && 'border-red-500'
                      )}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="mt-2 text-sm font-bold text-red-600">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 number
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={passwordForm.formState.isSubmitting}
                  className={clsx(
                    'w-full py-4 text-lg font-black text-white',
                    'border-[3px] border-black dark:border-white bg-orange-500',
                    'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]',
                    'transition-all duration-150',
                    'hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
                    'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {passwordForm.formState.isSubmitting ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>
                      <Save size={20} />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
