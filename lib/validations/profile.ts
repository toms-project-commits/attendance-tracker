/**
 * Profile validation schemas using Zod
 * Enforces data integrity for user profile operations
 */

import { z } from 'zod';

/**
 * Username validation schema
 * - 3-20 characters
 * - Lowercase alphanumeric and underscores only
 * - Automatically converts to lowercase
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(
    /^[a-z0-9_]+$/,
    'Username can only contain lowercase letters, numbers, and underscores'
  )
  .transform((val) => val.toLowerCase());

/**
 * Full name validation schema
 * - 1-100 characters
 * - Must contain at least one non-whitespace character
 */
export const fullNameSchema = z
  .string()
  .min(1, 'Full name is required')
  .max(100, 'Full name must be at most 100 characters')
  .regex(/\S+/, 'Full name cannot be empty or contain only spaces')
  .transform((val) => val.trim());

/**
 * Password validation schema
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long');

/**
 * Profile identity update schema
 * For updating username and full name
 */
export const profileIdentitySchema = z.object({
  username: usernameSchema,
  full_name: fullNameSchema,
});

export type ProfileIdentityData = z.infer<typeof profileIdentitySchema>;

/**
 * Email update schema
 */
export const emailUpdateSchema = z.object({
  email: emailSchema,
});

export type EmailUpdateData = z.infer<typeof emailUpdateSchema>;

/**
 * Password update schema
 * Includes current password and new password with confirmation
 */
export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;
