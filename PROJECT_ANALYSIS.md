# BunkSafe - Project Analysis

## Project Overview

**Application Name:** BunkSafe  
**Version:** 0.2.0  
**Purpose:** A student attendance tracking application designed to help college students in India maintain awareness of their attendance percentage to avoid debarment. The app provides real-time calculations of attendance, "bunk logic" (how many classes can be missed), and GPS-verified proof of attendance.

### Tech Stack

**Frontend:**
- **Framework:** Next.js 16.1.6 (React 19.2.4)
- **UI Styling:** Tailwind CSS 4.1.18 with Neo-Brutalist design system
- **Icons:** Lucide React 0.563.0
- **Date Handling:** date-fns 4.1.0
- **Type Safety:** TypeScript 5

**Backend/Database:**
- **BaaS:** Supabase (PostgreSQL database)
- **Authentication:** Supabase Auth (Email/Password + Google OAuth)
- **Client Library:** @supabase/supabase-js 2.93.2

**Mobile:**
- **Platform:** Capacitor 8.0.2 (Android native wrapper)
- **Plugins:** App, Browser, Filesystem
- **Export:** Static HTML/CSS/JS (`output: "export"`)
- **Deployment Target:** Android APK

**Deployment:**
- **Web:** Vercel (attendance-tracker-fawn-iota.vercel.app)
- **Mobile:** Standalone Android APK via Capacitor

---

## Feature List

### ✅ Completed Features

#### Authentication & User Management
1. **Email/Password Authentication**
   - Sign up with email and password
   - Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
   - "Remember Me" functionality
   - Password stored in plain text in `user_passwords` table for admin viewing

2. **Google OAuth Authentication**
   - Google Sign-In integration
   - Native app support using Capacitor Browser plugin
   - Deep link callback handling (`com.thomasgeorge.bunksafe://login-callback`)
   - Mandatory password setup after OAuth sign-in

3. **Password Management**
   - Forgot password flow with email reset link
   - Update password page
   - Set password page for OAuth users

4. **User Profiles**
   - Unique username system (3-20 chars, alphanumeric + underscore)
   - Username is permanent (cannot be changed)
   - Case-insensitive username validation

#### Setup & Configuration
5. **Semester Setup**
   - Semester start and end date selection
   - Saturday off configuration (select which weeks: 1st-5th)
   - Manual holiday marking via calendar interface
   - Visual feedback for selected holidays

6. **Subject Management**
   - Add/Edit/Delete subjects (up to 10)
   - Color coding for subjects (8 predefined colors)
   - Custom target attendance percentage per subject
   - Cascade delete (removes related timetable and attendance data)

7. **Timetable Management**
   - Weekly schedule creation (Mon-Sun)
   - Multiple slot types: SUBJECT, BREAK, SPORTS, LIBRARY, EXAM
   - Time picker with 12H/24H format toggle
   - Start/End time validation
   - Support for multiple classes of same subject per day
   - Visual timeline interface

#### Attendance Tracking
8. **Mark Attendance**
   - Date navigation (prev/next/today)
   - Quick bulk actions (All Present, All Absent, All Cancelled)
   - Three status options per class: PRESENT, ABSENT, CANCELLED
   - Support for extra classes (not in timetable)
   - Past date editing capability
   - Real-time statistics display

9. **Proof of Attendance** ⭐
   - GPS-verified proof capture using device camera
   - Automatic watermarking with:
     - Timestamp (date and time)
     - GPS coordinates (latitude, longitude)
     - Subject name
     - "BUNKSAFE VERIFIED PROOF" header
   - Storage on device using Capacitor Filesystem (IndexedDB fallback)
   - Proof viewing by subject
   - Persistent storage (survives app restarts)
   - Multiple proofs per day support

#### Analytics & Insights
10. **Dashboard**
    - Overall attendance percentage with visual gauge
    - Safety status indicator (Safe/Critical based on 75% threshold)
    - Today's class count
    - Subject count
    - Quick stats cards with neo-brutalist design
    - Low attendance warnings

11. **Analytics Page**
    - Subject-wise breakdown with color coding
    - Attendance percentage per subject
    - Present/Absent/Total class counts
    - Target achievement status
    - **Bunk Logic Calculator:** 
      - "You can miss X more classes" (if above target)
      - "Attend next X classes" (if below target)
    - Sortable by: Name, Percentage, Status
    - Progress bars with visual indicators

12. **Proofs Gallery**
    - View all attendance proofs by subject
    - Grid layout with thumbnails
    - Full-screen proof viewer
    - Subject name and date display
    - Handles deleted subjects gracefully

#### Additional Pages
13. **About Page**
    - Mission statement
    - Developer story
    - Free forever pledge
    - Roadmap preview (Classmate Companion, Shared Tracking)
    - Support information (placeholder)

### 🚧 Partially Implemented / Placeholders

1. **Attendance Calendar Component** - Created but not integrated in any page
2. **Liquid Wave Gauge Component** - Created but not used (replaced with circular progress)
3. **Debug Proofs Page** - Exists but not linked in navigation
4. **Support/Donation System** - Mentioned in About page but not implemented
5. **Shared Tracking Feature** - Planned (username system in place for future use)
6. **Classmate Companion** - Mentioned in roadmap, not implemented

---

## Architecture and File Structure

### Directory Organization

```
attendance-tracker/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Root redirect logic
│   ├── layout.tsx                # Root layout with fonts
│   ├── globals.css               # Tailwind + custom CSS
│   ├── login/                    # Authentication
│   ├── setup/                    # Initial semester configuration
│   ├── dashboard/                # Main dashboard
│   ├── subjects/                 # Subject CRUD
│   ├── timetable/                # Weekly schedule
│   ├── mark/                     # Daily attendance marking
│   ├── analytics/                # Statistics and insights
│   ├── proofs/                   # Proof gallery
│   ├── about/                    # About the app
│   ├── forgot-password/          # Password reset request
│   ├── set-password/             # OAuth user password setup
│   └── update-password/          # Password change
│
├── components/                   # Reusable React components
│   ├── AttendanceCalendar.tsx    # Calendar view (unused)
│   ├── LiquidWaveGauge.tsx       # Animated gauge (unused)
│   └── ProofCapture.tsx          # Camera + GPS proof capture
│
├── lib/                          # Utilities and hooks
│   ├── supabase.ts               # Supabase client setup
│   ├── config.ts                 # Platform detection & config
│   ├── capacitor.ts              # Capacitor helpers
│   ├── proofStorage.ts           # IndexedDB proof storage
│   ├── persistentProofStorage.ts # Filesystem proof storage
│   └── hooks/
│       └── useStudentData.ts     # Main data fetching hook
│
├── database/                     # Database migrations (14 total)
│   └── migrations/               # SQL schema evolution
│
├── android/                      # Capacitor Android project
│   ├── app/
│   │   └── src/main/AndroidManifest.xml
│   └── build.gradle
│
├── public/                       # Static assets
├── assets/                       # App icons
├── .env.local                    # Environment variables
├── capacitor.config.ts           # Capacitor configuration
├── next.config.ts                # Next.js config (static export)
├── tailwind.config.js            # Tailwind CSS config
└── package.json                  # Dependencies
```

### Key Directories Purpose

**`app/`** - All user-facing pages using Next.js App Router
- Client-side rendered (CSR) with "use client" directive
- Authentication guards on each protected page
- Neo-brutalist design system throughout

**`components/`** - Shared UI components
- `ProofCapture.tsx` - Complex camera+GPS proof capture modal
- Unused components kept for potential future use

**`lib/`** - Business logic and utilities
- `useStudentData.ts` - Central data hook with caching & optimization
- `persistentProofStorage.ts` - Main proof storage implementation
- `supabase.ts` - Database client with session persistence

**`database/migrations/`** - 14 SQL migrations tracking schema evolution
- Progressive improvement from basic to production-ready
- Security and performance optimizations
- RLS policy management

---

## Logical Flow

### Core Business Logic

#### 1. Attendance Calculation Algorithm

The attendance percentage is calculated by iterating through every day from semester start to today:

```typescript
// Pseudo-code representation
for each day in [semesterStart...today]:
  if day is Sunday: skip
  if day is Holiday (manual): skip
  if day is Saturday AND in saturdayOffs array: skip
  
  classesForDay = timetable entries matching day's weekday
  
  for each class in classesForDay:
    attendanceLog = find log for (date + subjectId + timetableSlotId)
    
    if log.status == 'CANCELLED': skip (don't count)
    
    totalClasses++
    if log.status == 'PRESENT': attendedClasses++
    if log.status == 'ABSENT' or log is missing: bunkCount++

attendancePercentage = (attendedClasses / totalClasses) * 100
```

**Key Logic Points:**
- Sundays are always off
- Saturday logic uses "week number of month" (1st-5th Saturday)
- Cancelled classes don't affect attendance calculation
- Missing logs count as absent
- Supports multiple classes of same subject per day via `timetable_slot_id`

#### 2. "Bunk" Logic (How Many Classes Can I Miss?)

**If attendance >= target:**
```typescript
maxTotalAllowed = attended / (target / 100)
maxBunks = Math.floor(maxTotalAllowed - total)
// Message: "You can miss up to X more classes"
```

**If attendance < target:**
```typescript
numerator = (target/100 * total) - attended
denominator = 1 - (target/100)
mustAttend = Math.ceil(numerator / denominator)
// Message: "Attend the next X classes to reach target"
```

**Example:**
- Attended: 80, Total: 100, Target: 75%
- Current: 80% ✅
- maxTotalAllowed = 80 / 0.75 = 106.67
- Can miss: floor(106.67 - 100) = 6 more classes

#### 3. Authentication Flow

**Email/Password Sign Up:**
1. User enters email + password
2. Supabase Auth creates account
3. Password stored in `user_passwords` table (plain text)
4. `handle_new_user()` trigger creates profile entry
5. Redirect to `/setup` for semester configuration

**Google OAuth:**
1. User clicks "Sign in with Google"
2. **Web:** Opens OAuth URL, redirects to `/set-password`
3. **Mobile:** Opens in-app browser via Capacitor
4. Deep link callback captures tokens
5. User must set password (even for OAuth accounts)
6. Redirect to `/setup` if new, `/dashboard` if returning

**Login Flow:**
1. Check session on page load (`supabase.auth.getUser()`)
2. If no session: redirect to `/login`
3. If session exists but no `semester_start`: redirect to `/setup`
4. If fully configured: show content

**Session Persistence:**
- Uses localStorage by default
- "Remember Me" unchecked = moves session to sessionStorage
- Auto-refresh tokens enabled
- Persistent across page reloads

#### 4. Data Flow: User Action → Database

**Example: Marking Attendance**

```
1. User navigates to /mark page
   └─> useStudentData() hook fetches:
       - Profile (semester dates, saturday_offs)
       - Subjects (name, color, target)
       - Timetable (weekly schedule)
       - Holidays (user-specific dates)
       - Attendance Logs (existing records)

2. Component renders class list for selected date
   └─> Matches timetable slots to day of week
   └─> Links existing attendance logs via timetable_slot_id
   └─> Shows current status (Present/Absent/Cancelled)

3. User changes status or adds proof
   └─> Local state updated in component
   └─> Proof image captured → Capacitor Filesystem
   └─> proof_url set to "proof://{timestamp}"

4. User clicks "CONFIRM & SAVE"
   └─> DELETE all existing logs for this date (user_id + date)
   └─> INSERT new logs with status + proof_url
   └─> Supabase RLS ensures user_id matches auth.uid()

5. Redirect to /dashboard?refresh={timestamp}
   └─> Forces cache bypass in useStudentData
   └─> Dashboard shows updated statistics
```

---

## Database Schema

### Tables Overview

The database uses PostgreSQL (Supabase) with Row-Level Security (RLS) enabled on all tables.

#### **1. profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,              -- Permanent, case-insensitive
  semester_start DATE,
  semester_end DATE,
  saturday_offs INTEGER[],           -- Array: [1,2,3,4,5]
  weekly_offs INTEGER[],             -- Array: [0] for Sunday
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Constraints:**
- `username_format`: Regex `^[a-zA-Z0-9_]{3,20}$`
- Unique index on `LOWER(username)`

**RLS Policy:** Users manage their own profile (`id = auth.uid()`)

---

#### **2. subjects**
```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL,           -- e.g., '#3B82F6'
  target_percentage INTEGER NOT NULL, -- 0-100
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Constraints:**
- `target_percentage_range`: Between 0 and 100
- Foreign key to `auth.users` with `ON DELETE CASCADE`

**RLS Policy:** Users manage their own subjects (`user_id = auth.uid()`)

**Indexes:**
- `idx_subjects_user_id` on `(user_id)`
- `idx_subjects_user_name` on `(user_id, name)`
- `idx_subjects_user_created` on `(user_id, created_at DESC)`

---

#### **3. timetable_slots**
```sql
CREATE TABLE timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,      -- 1=Monday, 7=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_type TEXT NOT NULL,           -- 'SUBJECT', 'BREAK', 'SPORTS', 'LIBRARY', 'EXAM'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Constraints:**
- `valid_day_of_week`: Between 1 and 7
- `valid_time_order`: `start_time < end_time`
- `valid_slot_type`: Must be one of the enum values
- Unique index: `(user_id, day_of_week, start_time, slot_type)`

**RLS Policy:** Users manage their own timetable

**Indexes:**
- `idx_timetable_user_day` on `(user_id, day_of_week)`
- `idx_timetable_user_subject` on `(user_id, subject_id)`

---

#### **4. attendance_logs** ⭐ (Most Complex)
```sql
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL,               -- 'PRESENT', 'ABSENT', 'CANCELLED'
  start_time TIME,                    -- For extra classes only
  end_time TIME,                      -- For extra classes only
  proof_url TEXT,                     -- Format: "proof://{timestamp}"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `valid_attendance_status`: Must be 'PRESENT', 'ABSENT', or 'CANCELLED'
- Three unique indexes to handle different scenarios:
  1. `idx_unique_attendance_with_slot`: `(user_id, date, timetable_slot_id)` WHERE timetable_slot_id IS NOT NULL
  2. `idx_unique_attendance_extra_class`: `(user_id, date, subject_id, start_time)` WHERE timetable_slot_id IS NULL AND start_time IS NOT NULL
  3. `idx_unique_attendance_no_slot_no_time`: `(user_id, date, subject_id)` WHERE both are NULL

**Purpose of Unique Indexes:**
- Allows multiple classes of same subject on same day
- Links timetable-based classes via `timetable_slot_id`
- Extra classes use `start_time` as differentiator
- Prevents duplicate entries for same class

**RLS Policy:** Users manage their own logs

**Indexes:**
- `idx_logs_user_date` on `(user_id, date DESC)`
- `idx_logs_slot` on `(timetable_slot_id)` WHERE NOT NULL
- `idx_attendance_logs_proof_url` on `(proof_url)` WHERE NOT NULL

---

#### **5. holidays**
```sql
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  name TEXT,                          -- Optional description
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Constraints:**
- Unique index: `(user_id, date)`

**RLS Policy:** Users manage their own holidays

**Indexes:**
- `idx_holidays_user_date` on `(user_id, date ASC)`

---

#### **6. user_passwords** ⚠️
```sql
CREATE TABLE user_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,             -- ⚠️ PLAIN TEXT
  auth_provider TEXT DEFAULT 'google', -- 'google', 'email'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**⚠️ SECURITY CONCERN:**
- Stores passwords in **plain text** for "admin viewing"
- RLS allows ALL authenticated users to view all passwords
- This is a significant security vulnerability

**RLS Policies:**
- SELECT: `true` (anyone authenticated can view)
- INSERT/UPDATE: `user_id = auth.uid()` (users manage their own)

---

#### **7. schema_migrations**
```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  checksum TEXT
);
```
**Purpose:** Tracks which migrations have been applied

**RLS Policy:** Public read-only, service-role write

---

### Migration 003 Significance (`003_improve_schema.sql`)

This migration was pivotal as it established:

1. **Audit Trails:** Added `created_at` and `updated_at` to all tables
2. **Automatic Timestamps:** Created trigger function `update_updated_at_column()`
3. **Data Integrity:** 
   - Foreign key CASCADE deletes (subject deletion cleans up all related data)
   - Check constraints for valid ranges
   - Unique constraints to prevent duplicates
4. **Documentation:** Added comments on tables and columns
5. **Initial RLS Setup:** First implementation of Row-Level Security

**Why Critical:**
- Foundation for all subsequent migrations
- Established patterns (triggers, constraints, indexes)
- Many later migrations (004-014) built on or fixed issues from this one

---

## Deployment and Environment

### Environment Variables Required

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://igmzqcydjmmtuavqeeak.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=https://attendance-tracker-fawn-iota.vercel.app
```

**Variable Purposes:**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project API endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key for client auth
- `NEXT_PUBLIC_SITE_URL`: Used for OAuth redirects (critical for native apps)

### Deployment Configuration

**Vercel (Web):**
```typescript
// next.config.ts
{
  output: "export",              // Static site generation
  images: { unoptimized: true }, // Required for static export
  trailingSlash: true            // File compatibility
}
```

**Capacitor (Android):**
```typescript
// capacitor.config.ts
{
  appId: 'com.thomasgeorge.bunksafe',
  appName: 'BunkSafe',
  webDir: 'out'                  // Points to Next.js export
}
```

**Build Commands:**
```bash
# Web deployment
npm run build              # Creates /out directory

# Android APK
npm run build:mobile       # Build + Capacitor sync
npx cap open android       # Open in Android Studio
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

---

## Technical Debt and Recommendations

### 🔴 Critical Security Issues

#### 1. **Plain Text Password Storage**
**Issue:** `user_passwords` table stores passwords in plain text with public SELECT policy
```sql
password TEXT NOT NULL,  -- ⚠️ PLAIN TEXT
CREATE POLICY "Allow viewing all passwords" ON user_passwords FOR SELECT USING (true);
```

**Risk:** 
- Any authenticated user can read ALL passwords
- Database breach exposes all passwords
- Violates security best practices

**Recommendation:**
- **Remove** the `user_passwords` table entirely
- Supabase Auth already handles password hashing securely
- If admin access needed, use Supabase Dashboard's built-in user management
- For password recovery statistics, use Auth events/logs instead

---

#### 2. **Overly Permissive RLS Policy**
**Issue:** user_passwords table allows all authenticated users to view all passwords

**Recommendation:**
- If table must exist, restrict SELECT to service role only
- Use Supabase Functions with service role key for admin operations
- Never expose passwords to client-side

---

### ⚠️ High Priority Issues

#### 3. **Proof Storage Scalability**
**Issue:** Proofs stored on device using Capacitor Filesystem
- Not backed up
- Lost on app uninstall
- Not accessible from web version
- No cross-device sync

**Recommendation:**
- Implement optional cloud backup using Supabase Storage
- Keep local storage as primary (fast access)
- Add sync feature for backup/restore
- Consider compression (WebP format already used)

---

#### 4. **Missing Data Validation on Frontend**
**Issue:** Some inputs lack client-side validation before submission

**Examples:**
- Subject name length not enforced
- Time conflicts in timetable not prevented
- No warning when deleting subject with attendance data

**Recommendation:**
```typescript
// Add validation schemas using Zod or similar
const subjectSchema = z.object({
  name: z.string().min(1).max(50),
  target_percentage: z.number().min(0).max(100),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
});
```

---

#### 5. **Error Handling Inconsistency**
**Issue:** Some components have robust error handling, others silently fail

**Example (Good):**
```typescript
// lib/persistentProofStorage.ts
console.log('[PROOF] Starting proof save...', { userId, date, subjectId });
try {
  // Detailed logging
  console.log('[PROOF] Step 1: Ensuring directory...');
  // ... operation
  console.log('[PROOF SUCCESS] Proof saved!');
} catch (error) {
  console.error('[PROOF ERROR] PROOF SAVE FAILED:', error);
  throw new Error(`Proof save failed: ${errorMsg}`);
}
```

**Example (Bad):**
```typescript
// Some pages
catch (error) {
  console.error('Error:', error);
  // No user feedback, no recovery
}
```

**Recommendation:**
- Standardize error handling with toast notifications
- Add error boundary components
- Implement retry logic for network failures
- Log errors to monitoring service (Sentry, LogRocket)

---

### 📊 Performance Optimizations

#### 6. **useStudentData Hook Optimization** ✅ (Partially Done)
**Current State:** Hook has caching, rate limiting, and retry logic

**Remaining Issues:**
- Cache doesn't invalidate on mutations
- 5-minute TTL may be too long for real-time updates
- Could use React Query or SWR for better cache management

**Recommendation:**
```typescript
// Consider migrating to React Query
const { data, isLoading, refetch } = useQuery({
  queryKey: ['studentData', user?.id],
  queryFn: fetchStudentData,
  staleTime: 2 * 60 * 1000, // 2 minutes
  cacheTime: 5 * 60 * 1000  // 5 minutes
});
```

---

#### 7. **Database Query Optimization**
**Issue:** Some queries fetch more data than needed

**Example:**
```typescript
// Fetches ALL timetable slots for user, then filters in JS
const timetable = await supabase
  .from('timetable_slots')
  .select('*')
  .eq('user_id', user.id);

// Filter for specific day
const daySlots = timetable.filter(s => s.day_of_week === dbDay);
```

**Recommendation:**
```typescript
// Filter at database level
const daySlots = await supabase
  .from('timetable_slots')
  .select('*')
  .eq('user_id', user.id)
  .eq('day_of_week', dbDay);
```

---

#### 8. **Unused Components Bloat**
**Issue:** `AttendanceCalendar.tsx` and `LiquidWaveGauge.tsx` are complete but unused

**Bundle Impact:**
- ~250 lines of unused code
- Canvas animations included in bundle
- date-fns functions imported

**Recommendation:**
- Either integrate or delete unused components
- If keeping for future use, move to `/components/unused/`
- Consider lazy loading if integrated

---

### 🐛 Bug Fixes Needed

#### 9. **Saturday Off Calculation Edge Case**
**Issue:** "First Saturday of month" logic in attendance calculation

```typescript
// Current implementation
const firstOfMonth = startOfMonth(dayObj);
for (let i = 0; i < 7; i++) {
  const candidateDate = addDays(firstOfMonth, i);
  if (getDayOfWeek(candidateDate) === 6) {
    firstSaturday = candidateDate;
    break;
  }
}
```

**Problem:** If month starts on Sunday (day 0), first Saturday is day 6, but this doesn't handle months starting on Saturday (day 6).

**Recommendation:**
```typescript
// More robust calculation
const firstSaturday = eachDayOfInterval({
  start: startOfMonth(dayObj),
  end: addDays(startOfMonth(dayObj), 6)
}).find(d => isSaturday(d));
```

---

#### 10. **Race Condition in Mark Attendance**
**Issue:** When saving attendance, DELETE then INSERT can fail partially

```typescript
// Current flow
await supabase.from('attendance_logs').delete().eq('user_id', user.id).eq('date', date);
await supabase.from('attendance_logs').insert(logsWithProofs);
```

**Problem:** If INSERT fails, data is lost (DELETE succeeded)

**Recommendation:**
```typescript
// Use UPSERT instead
await supabase.from('attendance_logs')
  .upsert(logsWithProofs, { 
    onConflict: 'user_id,date,timetable_slot_id'
  });
```

---

### 📱 Mobile-Specific Issues

#### 11. **Deep Link Handling**
**Issue:** OAuth callback relies on deep link, but URL scheme not registered in AndroidManifest.xml

**Risk:** OAuth may fail silently on some devices

**Recommendation:**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.thomasgeorge.bunksafe" 
        android:host="login-callback" />
</intent-filter>
```

---

#### 12. **Camera Permissions**
**Issue:** ProofCapture component requests camera but may not have manifest permissions

**Recommendation:**
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

---

### 🎨 UX Improvements

#### 13. **Loading States**
**Issue:** Some pages show blank screen while loading (setup, proofs)

**Recommendation:**
- Add skeleton loaders
- Show progressive loading (load critical data first)
- Add timeout warnings for slow connections

---

#### 14. **Offline Support**
**Issue:** No offline functionality - app requires internet

**Recommendation:**
- Implement service worker for offline caching
- Queue attendance changes for sync when online
- Show offline indicator
- Use IndexedDB for offline data storage

---

#### 15. **Accessibility**
**Issues:**
- Neo-brutalist design uses low contrast colors in some areas
- No keyboard navigation support
- No screen reader optimization
- Touch targets may be too small on some buttons

**Recommendation:**
```tsx
// Add ARIA labels
<button aria-label="Mark as present" onClick={...}>
  <Check size={24} />
</button>

// Improve contrast
const bgColor = attendancePercent >= 75 
  ? 'bg-green-600' // Darker for better contrast
  : 'bg-red-600';
```

---

### 🔧 Code Quality

#### 16. **Type Safety Improvements**
**Issue:** Some TypeScript `any` types used

```typescript
// lib/hooks/useStudentData.ts
const fetchWithRetry = async (query: any, retries = 3): Promise<any> => {
  // ...
};
```

**Recommendation:**
```typescript
type SupabaseQuery<T> = PromiseLike<PostgrestResponse<T>>;

const fetchWithRetry = async <T>(
  query: SupabaseQuery<T>, 
  retries = 3
): Promise<PostgrestResponse<T>> => {
  // ...
};
```

---

#### 17. **Duplicate Logic**
**Issue:** Attendance calculation logic duplicated in:
- `app/dashboard/page.tsx`
- `app/analytics/page.tsx`

**Recommendation:**
```typescript
// lib/attendanceCalculator.ts
export function calculateAttendance(
  profile: Profile,
  subjects: Subject[],
  timetable: TimetableSlot[],
  holidays: Holiday[],
  logs: AttendanceLog[]
): AttendanceStats {
  // Centralized calculation logic
}
```

---

### 📚 Documentation Needed

#### 18. **Missing Documentation**
- No README.md
- No API documentation
- No component storybook
- No database schema diagram
- No deployment guide

**Recommendation:**
Create comprehensive documentation:
```markdown
# BunkSafe

## Setup Instructions
## Database Schema
## API Reference
## Deployment Guide
## Contributing Guidelines
```

---

## Summary and Recommendations

### ✅ What's Working Well

1. **Clean Architecture:** Well-organized file structure
2. **Modern Tech Stack:** Next.js 16, React 19, TypeScript
3. **Progressive Database:** 14 migrations show iterative improvement
4. **Security Conscious:** RLS on all tables, optimized policies
5. **Mobile-First:** Capacitor integration for native features
6. **Unique Feature:** GPS-verified proof of attendance
7. **Free Forever:** No paywall, all features available

### 🎯 Priority Action Items

1. **🔴 CRITICAL:** Remove plain-text password storage
2. **🔴 CRITICAL:** Fix RLS policy on user_passwords
3. **⚠️ HIGH:** Add deep link intent filter in AndroidManifest
4. **⚠️ HIGH:** Implement proper error boundaries
5. **📊 MEDIUM:** Migrate to React Query for data management
6. **📊 MEDIUM:** Add offline support
7. **🐛 LOW:** Fix Saturday calculation edge case
8. **🐛 LOW:** Remove unused components

### 🚀 Future Enhancements

1. **Cloud Proof Backup:** Optional Supabase Storage sync
2. **Shared Tracking:** Leverage username system for friend comparison
3. **Classmate Companion:** Note-taking linked to timetable
4. **Push Notifications:** Daily attendance reminders
5. **Export Reports:** PDF/CSV attendance reports
6. **Dark Mode:** Full dark theme support (partially implemented)
7. **Multi-language:** i18n for Indian languages

---

**Analysis Completed:** February 7, 2026  
**Analyst:** AI Code Reviewer  
**Project Version:** 0.2.0  
**Codebase Health:** 🟢 Good (with critical security issues to address)
