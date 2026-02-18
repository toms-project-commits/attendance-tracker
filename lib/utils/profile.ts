/**
 * Profile utility functions
 * Handles profile operations with Supabase
 */

import { supabase } from '@/lib/supabase';
import type { ProfileIdentityData } from '@/lib/validations/profile';

/**
 * Profile type definition matching the database schema
 */
export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch the current user's profile
 * @returns Profile data or null if not found
 */
export async function getUserProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw new Error('Failed to fetch profile');
  }

  return data;
}

/**
 * Update user's profile identity (username and full name)
 * @param profileData - The profile data to update
 * @returns Updated profile data
 */
export async function updateProfileIdentity(
  profileData: ProfileIdentityData
): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check if user already has a username set — username is immutable once chosen
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (fetchError) {
    throw new Error('Failed to fetch current profile');
  }

  if (existing?.username && existing.username !== profileData.username.toLowerCase()) {
    throw new Error('Username cannot be changed once set');
  }

  // Only update full_name; username is set once and cannot be changed
  const updateData: { full_name: string; username?: string } = {
    full_name: profileData.full_name,
  };

  // Allow setting username only if it hasn't been set yet
  if (!existing?.username) {
    updateData.username = profileData.username.toLowerCase();
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Username is already taken');
    }
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }

  return data;
}

/**
 * Update user's email address
 * @param email - The new email address
 */
export async function updateUserEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    console.error('Error updating email:', error);
    throw new Error(error.message || 'Failed to update email');
  }
}

/**
 * Update user's password
 * @param currentPassword - The current password for verification
 * @param newPassword - The new password
 */
export async function updateUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // First, verify the current password by attempting to sign in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error('User email not found');
  }

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    throw new Error('Current password is incorrect');
  }

  // Update to new password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Error updating password:', error);
    throw new Error(error.message || 'Failed to update password');
  }
}

/**
 * Get initials from full name for avatar placeholder
 * @param fullName - The user's full name
 * @returns Initials (max 2 characters)
 */
export function getInitials(fullName: string | null): string {
  if (!fullName) return '?';

  const names = fullName.trim().split(/\s+/);

  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }

  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

/**
 * Check if a username is available
 * @param username - The username to check
 * @returns true if available, false if taken
 */
export async function checkUsernameAvailability(
  username: string
): Promise<boolean> {
  const normalizedUsername = username.toLowerCase();

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .ilike('username', normalizedUsername)
    .maybeSingle();

  if (error) {
    console.error('Error checking username:', error);
    return false;
  }

  return !data;
}
