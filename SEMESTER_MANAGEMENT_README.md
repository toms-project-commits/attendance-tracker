# 📚 Phase 2: Semester Management & Reset Logic

## Overview

BunkSafe now supports **multi-semester tracking** with archiving capabilities. This upgrade transforms the app from a single-use tracker to a long-term platform that allows users to:

- 📦 Archive old semesters while preserving historical data
- 🔄 Start new semesters with or without cloning subjects/timetable
- 📊 Keep attendance data neatly organized by semester
- 🎯 Prepare for future features (BunkSafe Coins, Themes) that persist across semesters

## Key Features

### 1. **Semesters Table**
A new `semesters` table tracks academic periods:
- **One active semester per user** at any time
- Each semester has a name, start date, and end date
- Archived semesters are marked as inactive

### 2. **Data Isolation**
All core data is now linked to semesters:
- ✅ Subjects → `semester_id`
- ✅ Timetable Slots → `semester_id`
- ✅ Attendance Logs → `semester_id`

This ensures clean separation between different academic periods.

### 3. **Semester Reset Workflow**
A beautiful Neo-Brutalist multi-step UI (`/setup/reset`) guides users through:

**Step 1: Archive Current** 📦
- Name and archive the current active semester
- Warning: Archived attendance logs are frozen

**Step 2: Subject Retention** 📚
- Choose to clone subjects and timetable, or start fresh
- Cloning preserves all subject colors and target percentages

**Step 3: New Dates** 📅
- Set the new semester name and date range
- Visual duration calculator

**Step 4: Confirm** ✅
- Review all changes before finalizing
- Clear summary of what will happen

### 4. **Smart Data Migration**
The migration (`016_semester_management_system.sql`) handles:
- Creating a "Current Semester" for existing users
- Linking all existing data to this semester
- Backward compatibility for legacy data

## Database Schema Changes

### New Table: `semesters`
```sql
CREATE TABLE semesters (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Updated Tables
All three core tables now include:
```sql
ALTER TABLE subjects ADD COLUMN semester_id UUID REFERENCES semesters(id);
ALTER TABLE timetable_slots ADD COLUMN semester_id UUID REFERENCES semesters(id);
ALTER TABLE attendance_logs ADD COLUMN semester_id UUID REFERENCES semesters(id);
```

## Helper Functions

### `clone_semester_data()`
Clones subjects and timetable from one semester to another:
```sql
SELECT * FROM clone_semester_data(
    p_user_id := auth.uid(),
    p_from_semester_id := 'old-semester-id',
    p_to_semester_id := 'new-semester-id'
);
```
Returns: `(subjects_cloned INT, slots_cloned INT)`

### `archive_semester()`
Archives a semester by setting `is_active = false`:
```sql
SELECT archive_semester(
    p_user_id := auth.uid(),
    p_semester_id := 'semester-id',
    p_archive_name := 'Fall 2025 (Archived)'
);
```

### `get_active_semester_id()`
Quickly fetches the active semester ID for a user:
```sql
SELECT get_active_semester_id(auth.uid());
```

## Frontend Changes

### Updated `useStudentData` Hook
Now includes `activeSemester` in the returned data:
```typescript
const { 
  user, 
  profile, 
  activeSemester,  // NEW!
  subjects, 
  timetable, 
  holidays, 
  logs, 
  loading, 
  error, 
  refresh 
} = useStudentData();
```

The hook automatically:
- Fetches the active semester first
- Filters all subjects, timetable, and logs by `semester_id`
- Falls back to unfiltered data for backward compatibility

### New Page: `/setup/reset`
A complete semester reset wizard with:
- 🎨 Neo-Brutalist design (4px borders, bold shadows)
- 📍 Progress indicator showing current step
- ⚠️ Clear warnings about data archiving
- ✅ Confirmation step before finalizing

## Usage Guide

### For Users

1. **Starting a New Semester:**
   - Navigate to `/setup/reset`
   - Follow the 4-step wizard
   - Choose whether to clone subjects or start fresh

2. **Viewing Active Semester:**
   - The dashboard automatically shows only active semester data
   - All subjects and logs are filtered automatically

3. **Accessing Archived Data:**
   - Archived data remains in the database
   - Future feature: Semester history viewer

### For Developers

1. **Run the Migration:**
   ```bash
   # In Supabase SQL Editor
   # Execute: database/migrations/016_semester_management_system.sql
   ```

2. **Creating Subjects:**
   ```typescript
   const { data: newSubject } = await supabase
     .from('subjects')
     .insert({
       user_id: userId,
       semester_id: activeSemesterId,  // Include this!
       name: 'Mathematics',
       color_hex: '#FF6B6B',
       target_percentage: 75
     });
   ```

3. **Querying by Semester:**
   ```typescript
   const { data: subjects } = await supabase
     .from('subjects')
     .select('*')
     .eq('user_id', userId)
     .eq('semester_id', activeSemesterId);
   ```

## Migration Safety

The migration (`016_semester_management_system.sql`) is:
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Non-destructive** - No data is deleted
- ✅ **Backward compatible** - Legacy data without `semester_id` still works
- ✅ **Automatic** - Creates "Current Semester" for existing users

### What Happens During Migration:

1. Creates `semesters` table with RLS policies
2. Adds `semester_id` columns to existing tables
3. Creates "Current Semester" for each existing user
4. Links all existing data to this semester
5. Updates unique indexes to include `semester_id`

## Row Level Security (RLS)

All semester operations are protected:
```sql
-- Users can only view their own semesters
CREATE POLICY "Users can view their own semesters" ON semesters
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only modify their own semesters
CREATE POLICY "Users can update their own semesters" ON semesters
  FOR UPDATE USING (auth.uid() = user_id);
```

## Future Enhancements

This foundation enables:
- 🪙 **BunkSafe Coins** - Persistent across semesters
- 🎨 **Themes** - User preferences that persist
- 📈 **Semester Comparison** - Compare attendance across terms
- 📊 **Archive Viewer** - Browse old semester data
- 🔍 **Search Across Semesters** - Find historical records

## Technical Highlights

### Neo-Brutalist Design
- **Bold borders:** 4px black borders everywhere
- **Box shadows:** `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
- **High contrast:** Yellow, green, purple, blue accents
- **Interactive:** Shadow reduces on hover/press

### Data Integrity
- **Foreign key cascades:** Deleting a semester removes all related data
- **Unique constraints:** No duplicate slots per semester
- **Validation:** Date ranges, name lengths, active semester enforcement

### Performance
- **Indexed queries:** Fast lookups on `semester_id`
- **Cached results:** 5-minute cache with smart invalidation
- **Parallel fetching:** All data loaded simultaneously

## Troubleshooting

### "No Active Semester" Error
**Cause:** User doesn't have an active semester
**Solution:** 
1. Check if user has any semesters: `SELECT * FROM semesters WHERE user_id = 'user-id'`
2. Create one manually or guide user to `/setup/reset`

### Data Not Showing After Reset
**Cause:** Subjects not linked to new semester
**Solution:**
1. Verify `semester_id` is set on new subjects
2. Check if cloning succeeded: Look for clone errors in logs

### Migration Failed
**Cause:** Existing data conflicts
**Solution:**
1. Migration is idempotent - safe to re-run
2. Check for specific errors in Supabase logs
3. Ensure all previous migrations ran successfully

## API Reference

### Supabase RPC Functions

```typescript
// Archive current semester
const { error } = await supabase.rpc('archive_semester', {
  p_user_id: userId,
  p_semester_id: semesterId,
  p_archive_name: 'Fall 2025 (Archived)'
});

// Clone data to new semester
const { data } = await supabase.rpc('clone_semester_data', {
  p_user_id: userId,
  p_from_semester_id: oldSemesterId,
  p_to_semester_id: newSemesterId
});
// Returns: { subjects_cloned: number, slots_cloned: number }

// Get active semester
const { data } = await supabase.rpc('get_active_semester_id', {
  p_user_id: userId
});
```

## Files Changed

### New Files
- ✅ `database/migrations/016_semester_management_system.sql` - Complete migration
- ✅ `app/setup/reset/page.tsx` - Semester reset wizard
- ✅ `SEMESTER_MANAGEMENT_README.md` - This documentation

### Modified Files
- ✅ `lib/hooks/useStudentData.ts` - Added semester filtering

## Testing Checklist

- [ ] Run migration in Supabase SQL Editor
- [ ] Verify existing data migrated to "Current Semester"
- [ ] Navigate to `/setup/reset`
- [ ] Complete semester reset workflow
- [ ] Test with subject cloning enabled
- [ ] Test with fresh start (no cloning)
- [ ] Verify new subjects appear on dashboard
- [ ] Check archived semester data is preserved
- [ ] Test RLS - try accessing other users' semesters (should fail)

## Credits

**Phase 2** of the BunkSafe evolution - Building longevity into the app architecture.

This feature provides the foundation for user profiles, coins, themes, and other persistent features coming in future phases.

---

**Next Phase Preview:** 🪙 BunkSafe Coins & 🎨 Theme System
