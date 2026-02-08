# 📋 User Profile Feature - Complete Documentation

## Overview

This document details the **User Profile Page** feature implementation for BunkSafe, including the database infrastructure, validation schemas, utility functions, and the complete UI component.

---

## 🗂️ File Structure

```
attendance-tracker/
├── database/migrations/
│   └── 015_enhanced_profiles_table.sql    # SQL migration with RLS & triggers
├── lib/
│   ├── validations/
│   │   └── profile.ts                      # Zod validation schemas
│   └── utils/
│       └── profile.ts                      # Profile utility functions
└── app/
    └── profile/
        └── page.tsx                        # Main profile page component
```

---

## 📦 Dependencies Installed

The following packages were added to support this feature:

- **react-hook-form** - Form state management
- **zod** - Schema validation
- **@hookform/resolvers** - React Hook Form + Zod integration

---

## 🗄️ Database Migration

### File: `database/migrations/015_enhanced_profiles_table.sql`

This migration creates/enhances the profiles table with:

#### Schema
- `id` (UUID) - Primary key, references auth.users
- `username` (TEXT) - Unique, lowercase, 3-20 chars
- `full_name` (TEXT) - User's full name
- `created_at` (TIMESTAMPTZ) - Auto-set on creation
- `updated_at` (TIMESTAMPTZ) - Auto-updated on changes

**Note:** No avatar/image columns are included. The UI uses a "Letter Avatar" (initials on a colored background) for user display.

#### Features
1. **Automatic Profile Creation** - Trigger automatically creates profile entry when user signs up
2. **Username Uniqueness** - Case-insensitive unique constraint
3. **Auto-Update Timestamps** - Trigger updates `updated_at` on every change
4. **Row Level Security (RLS)** - Four policies:
   - Users can view their own profile
   - Users can update their own profile
   - Users can insert their own profile
   - Users can view other profiles by username (for future friend system)
5. **Data Validation** - Username format constraint (3-20 chars, lowercase alphanumeric + underscore)

#### How to Apply
Run this SQL in your Supabase SQL Editor or via migration tool.

---

## ✅ Validation Schemas

### File: `lib/validations/profile.ts`

Contains Zod schemas for all profile operations:

#### Schemas

**1. Username Schema**
```typescript
usernameSchema
- 3-20 characters
- Lowercase alphanumeric + underscores only
- Auto-converts to lowercase
```

**2. Full Name Schema**
```typescript
fullNameSchema
- 1-100 characters
- Must contain non-whitespace
- Auto-trims whitespace
```

**3. Password Schema**
```typescript
passwordSchema
- Min 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
```

**4. Email Schema**
```typescript
emailSchema
- Valid email format
- 5-255 characters
```

**5. Profile Identity Schema**
```typescript
profileIdentitySchema
- Combines username + full_name
```

**6. Email Update Schema**
```typescript
emailUpdateSchema
- For email changes
```

**7. Password Update Schema**
```typescript
passwordUpdateSchema
- Current password
- New password
- Confirm password
- Validates passwords match
```

---

## 🛠️ Utility Functions

### File: `lib/utils/profile.ts`

Core functions for profile operations:

#### Functions

**1. `getUserProfile()`**
- Fetches current user's profile
- Returns: `Profile | null`
- Throws: Error if not authenticated

**2. `updateProfileIdentity(profileData)`**
- Updates username and full name
- Handles username uniqueness errors
- Returns: Updated `Profile`

**3. `updateUserEmail(email)`**
- Updates user's email via Supabase Auth
- Sends confirmation email
- Returns: `void`

**4. `updateUserPassword(currentPassword, newPassword)`**
- Verifies current password first
- Updates to new password
- Returns: `void`

**5. `getInitials(fullName)`**
- Generates initials for avatar placeholder
- Returns: String (max 2 characters)
- Example: "John Doe" → "JD"

**6. `checkUsernameAvailability(username)`**
- Checks if username is available
- Case-insensitive check
- Returns: `boolean`

---

## 🎨 Profile Page Component

### File: `app/profile/page.tsx`

A comprehensive profile management page with three main sections:

### Features

#### 1. **Identity Module** (Yellow Header)
- **Letter Avatar** - Displays user's initials on gradient background (no image upload)
- Full Name field
- Username field (3-20 chars, lowercase alphanumeric + underscore)
- Real-time validation
- Success/Error toasts

#### 2. **Change Email Module** (Green Header)
- Email input field
- Shows current email
- Sends confirmation email on update
- Form validation with error messages

#### 3. **Change Password Module** (Orange Header)
- Current password field (with verification)
- New password field
- Confirm password field
- Password visibility toggles
- Password strength requirements displayed
- Clears form on success

### Design System

The page follows BunkSafe's **Neo-Brutalist** design:
- **Bold borders**: 3px/4px solid black/white
- **Box shadows**: 4px/6px offset shadows
- **High contrast colors**: Yellow, green, orange, blue
- **Sharp corners**: No border radius
- **Interactive effects**: Hover and active states
- **Dark mode support**: Automatic switching

### UX Features

✅ **Toast Notifications** - Success/error messages (5s auto-dismiss)  
✅ **Loading States** - Spinner indicators during submissions  
✅ **Form Validation** - Real-time error display  
✅ **Password Visibility** - Eye icon toggles  
✅ **Responsive Design** - Mobile-first approach  
✅ **Accessibility** - ARIA labels and semantic HTML  
✅ **Capacitor Compatible** - No Node.js modules used  

---

## 🚀 Usage

### Accessing the Profile Page

Users can navigate to `/profile` to manage their account.

### Typical User Flow

1. User logs in
2. Navigates to `/profile`
3. Sets/updates username and full name
4. Optionally changes email
5. Optionally changes password
6. Receives success/error feedback

---

## 🔐 Security Features

1. **Row Level Security (RLS)** - Database-level access control
2. **Password Verification** - Must provide current password to change
3. **Email Confirmation** - Supabase sends confirmation for email changes
4. **Input Validation** - Client-side (Zod) and server-side (PostgreSQL constraints)
5. **Unique Usernames** - Case-insensitive uniqueness enforced
6. **SQL Injection Protection** - Parameterized queries via Supabase client

---

## 🎯 Future Enhancements

Potential improvements for this feature:

- **Username Change History** - Track username changes
- **Account Deletion** - Allow users to delete their account
- **Two-Factor Authentication** - Add 2FA support
- **Email Preferences** - Notification settings
- **Profile Privacy** - Control who can view your profile
- **Friend System** - Use public username viewing for social features

---

## 🧪 Testing Checklist

Before deploying, test:

- [ ] Profile loads correctly for authenticated users
- [ ] Username validation (3-20 chars, lowercase)
- [ ] Username uniqueness (duplicate check)
- [ ] Full name validation (required, trimmed)
- [ ] Email update (sends confirmation)
- [ ] Password change (verifies current password)
- [ ] Password validation (8+ chars, uppercase, lowercase, number)
- [ ] Error handling (network errors, validation errors)
- [ ] Toast notifications (success/error)
- [ ] Loading states (spinners during submission)
- [ ] Dark mode compatibility
- [ ] Mobile responsiveness
- [ ] Form reset after successful updates

---

## 📚 Technical Specifications

### Framework & Libraries
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4.x**
- **Supabase JS Client 2.x**
- **React Hook Form**
- **Zod**

### Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Android Chrome)

### Capacitor Compatibility
✅ **Fully Compatible** - No Node.js-specific modules used  
✅ **Mobile-optimized** - Touch-friendly UI elements  
✅ **Native-safe** - Uses browser-safe APIs only  

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Username is already taken"  
**Solution**: Try a different username. The check is case-insensitive.

**Issue**: "Current password is incorrect"  
**Solution**: Verify you're entering your current password correctly.

**Issue**: "Failed to fetch profile"  
**Solution**: Check your internet connection and Supabase configuration.

**Issue**: Migration fails with constraint errors  
**Solution**: The migration is idempotent. Run it again. It handles existing data safely.

---

## 📞 Support

For issues or questions about this feature:
1. Check the code comments in each file
2. Review the Supabase documentation
3. Check the React Hook Form documentation
4. Review the Zod documentation

---

## ✨ Credits

**Feature**: User Profile Management  
**App**: BunkSafe - Attendance Tracker  
**Developer**: Thomas George  
**Design System**: Neo-Brutalism  
**Stack**: Next.js + Supabase + TypeScript  

---

## 📄 License

Part of the BunkSafe project. All rights reserved.
