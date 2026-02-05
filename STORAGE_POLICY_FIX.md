# 🔧 Storage Policy Fix Guide

## Why This is Needed

The storage policies for `attendance_proofs` bucket have a performance issue where `auth.uid()` is called for every file, instead of being cached. This needs to be fixed manually due to permission restrictions.

---

## 🚀 Quick Fix (2 Options)

### Option 1: Via Supabase Dashboard UI (Easiest - 3 minutes)

1. **Go to Storage Policies**
   - Open Supabase Dashboard
   - Navigate to: **Storage** → **Policies**
   - Find the `attendance_proofs` bucket section

2. **Edit Each Policy**
   
   You'll see 3-4 policies like:
   - "Users can upload attendance proofs"
   - "Users can view their attendance proofs"
   - "Users can delete attendance proofs"
   - "Users can update attendance proofs" (if exists)

3. **For Each Policy:**
   - Click the **Edit** (pencil) icon
   - Find the expression with: `auth.uid()`
   - Change it to: `(SELECT auth.uid())`
   - Click **Save**

**Example:**

**Before:**
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

**After:**
```sql
(storage.foldername(name))[1] = (SELECT auth.uid())::text
```

---

### Option 2: Via SQL Editor (Advanced - 1 minute)

If you prefer SQL, run this in the SQL Editor:

```sql
-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload attendance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their attendance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their attendance proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their attendance proofs" ON storage.objects;

-- Create optimized storage policies with subqueries
CREATE POLICY "Users can upload attendance proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can view their attendance proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can delete their attendance proofs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Users can update their attendance proofs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
```

**Note:** If you get a permission error again, you **must** use Option 1 (Dashboard UI).

---

## ✅ Verification

After fixing the policies, verify they're optimized:

### Via SQL Editor:

```sql
SELECT 
    policyname,
    definition
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%attendance proofs%';
```

Look for `(SELECT auth.uid())` in the definition column. ✅

---

## 🎯 Why This Matters

### Without Fix (Current):
- Query retrieves 1,000 files
- `auth.uid()` called 1,000 times
- Slow performance, unnecessary database load

### With Fix:
- Query retrieves 1,000 files
- `auth.uid()` called ONCE and cached
- ⚡ Much faster, optimized performance

---

## 🆘 Troubleshooting

### "I don't see the attendance_proofs bucket"
- The bucket might not be created yet
- Go to: **Storage** → Create bucket named `attendance_proofs`
- Set to **Private** (not public)
- Then add the policies

### "I only see 2-3 policies, not 4"
- That's fine! The 4th policy (UPDATE) might not exist
- Just fix the ones that exist

### "SQL Editor says permission denied"
- Use Option 1 (Dashboard UI) instead
- The UI has the necessary elevated permissions

---

## 📊 Complete Security Checklist

After fixing storage policies:

- [x] Run Migration 011 (database tables)
- [ ] Fix storage policies (this guide)  
- [ ] Enable HaveIBeenPwned password protection
- [ ] Run Supabase Security Advisor to verify

---

## 🎉 Done!

Once you've fixed the storage policies, all your Supabase security issues should be resolved!

Run the Security Advisor one more time to confirm:
**Database → Security Advisor → Run Advisor**

All checks should be ✅ green!
