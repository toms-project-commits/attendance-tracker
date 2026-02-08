/**
 * Authentication validation schemas using Zod
 * Enforces data integrity for auth-related operations
 */

import { z } from 'zod';

/**
 * Terms acceptance validation schema
 * Ensures users have accepted terms before signing up
 */
export const termsAcceptanceSchema = z.object({
  acceptedTerms: z.literal(true, {
    message: 'You must accept the Terms & Conditions and Privacy Policy to continue'
  })
});

export type TermsAcceptanceData = z.infer<typeof termsAcceptanceSchema>;

/**
 * Sign-up validation schema with terms acceptance
 */
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  acceptedTerms: z.literal(true, {
    message: 'You must accept the Terms & Conditions and Privacy Policy to continue'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export type SignUpData = z.infer<typeof signUpSchema>;
