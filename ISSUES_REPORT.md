# Codebase Issues Report

## 🔴 Critical Issues

### 1. **Missing Profile Creation on Signup**
**Location**: `app/setup/page.tsx:60-68`
**Issue**: The setup page tries to `UPDATE` a profile that may not exist. New users won't have a profile row, causing the update to fail silently.
**Fix**: Use `upsert` or check if profile exists and create it if not.

### 2. **SSR Compatibility - localStorage Access**
**Location**: `app/timetable/page.tsx:46, 101`
**Issue**: `localStorage` is accessed during SSR, which will cause errors in Next.js.
**Fix**: Check `typeof window !== 'undefined'` before accessing localStorage.

### 3. **SSR Compatibility - window Object**
**Location**: `app/forgot-password/page.tsx:19`
**Issue**: `window.location.origin` is accessed without SSR check.
**Fix**: Use Next.js `useRouter` or check for window existence.

### 4. **Missing useEffect Dependencies**
**Locations**: 
- `app/mark/page.tsx:32-34` - `fetchSchedule` missing from deps
- `app/subjects/page.tsx:37-39` - `fetchSubjects` missing from deps  
- `app/timetable/page.tsx:45-49` - `fetchData` missing from deps
- `app/analytics/page.tsx:41-215` - `router` in deps but function uses other values
**Issue**: Functions may use stale closures, causing bugs.
**Fix**: Add functions to dependency arrays or wrap in `useCallback`.

### 5. **Login Routing Logic Error**
**Location**: `app/login/page.tsx:35, 41`
**Issue**: Always redirects to `/setup` even if user already completed setup. Should check if profile exists and redirect to dashboard.
**Fix**: Check profile completion status before redirecting.

## 🟡 High Priority Issues

### 6. **Missing Error Handling**
**Locations**:
- `app/subjects/page.tsx:45-53` - No error handling for fetch
- `app/subjects/page.tsx:63-75` - No error feedback to user
- `app/timetable/page.tsx:51-83` - No error handling
- `app/mark/page.tsx:36-85` - Limited error handling
**Issue**: Errors are silently ignored, users don't know what went wrong.
**Fix**: Add try-catch blocks and user-friendly error messages.

### 7. **Missing Environment Variable Validation**
**Location**: `lib/supabase.ts:3-4`
**Issue**: Uses non-null assertion (`!`) without validation. App will crash at runtime if env vars are missing.
**Fix**: Add validation and helpful error messages.

### 8. **Duplicate Holiday Insertion**
**Location**: `app/setup/page.tsx:73-82`
**Issue**: Doesn't check if holidays already exist. Re-running setup will create duplicates.
**Fix**: Delete existing holidays first, or use upsert.

### 9. **Saturday Week Calculation Bug**
**Location**: `app/setup/page.tsx:233` and `app/analytics/page.tsx:112`
**Issue**: `Math.floor((day.getDate() - 1) / 7) + 1` calculates week number incorrectly. For example, day 1-7 should be week 1, but day 1 gives week 1, day 8 gives week 2 (correct), but day 7 gives week 1 (should be week 1, but the formula is confusing).
**Fix**: Use proper week-of-month calculation considering the first Saturday.

### 10. **Missing Null/Undefined Checks**
**Locations**:
- `app/mark/page.tsx:67-83` - Assumes `timetable` exists
- `app/analytics/page.tsx:75` - Assumes `profile.semester_start` is valid
- `app/timetable/page.tsx:71-82` - Assumes `slotData` structure
**Issue**: Code may crash if data is null/undefined.
**Fix**: Add proper null checks and fallbacks.

## 🟠 Medium Priority Issues

### 11. **Type Safety Issues**
**Locations**:
- `app/analytics/page.tsx:39` - `any[]` type
- `app/setup/page.tsx:86` - `error: any`
- `app/login/page.tsx:43` - `error: any`
- `app/mark/page.tsx:132` - `error: any`
- `app/timetable/page.tsx:71` - `(s: any)`
**Issue**: Using `any` defeats TypeScript's purpose.
**Fix**: Use proper types or `unknown` with type guards.

### 12. **Console.log in Production Code**
**Location**: `app/analytics/page.tsx:49`
**Issue**: Debug console.log left in production code.
**Fix**: Remove or use proper logging library.

### 13. **Missing Input Validation**
**Locations**:
- `app/setup/page.tsx:132-146` - No date validation (end before start, etc.)
- `app/subjects/page.tsx:128-134` - No min/max validation feedback
- `app/timetable/page.tsx:124-160` - No time validation (end before start)
**Issue**: Users can enter invalid data.
**Fix**: Add client-side validation with user feedback.

### 14. **Missing Loading States**
**Locations**:
- `app/subjects/page.tsx:56-76` - No loading indicator during add
- `app/timetable/page.tsx:124-160` - No loading during save
**Issue**: Users don't know if action is processing.
**Fix**: Add loading states for async operations.

### 15. **Accessibility Issues**
**Locations**: Throughout
**Issues**:
- Missing `aria-label` on icon-only buttons
- Missing `aria-live` regions for dynamic content
- Color-only indicators (not accessible to colorblind users)
- Missing keyboard navigation hints
**Fix**: Add ARIA labels and improve keyboard navigation.

### 16. **Home Page Still Has Default Template**
**Location**: `app/page.tsx`
**Issue**: Root page shows Next.js default template instead of redirecting to login/dashboard.
**Fix**: Add redirect logic or proper landing page.

### 17. **Missing Route Protection**
**Location**: `app/setup/page.tsx`
**Issue**: Setup page doesn't check if user is authenticated before allowing access.
**Fix**: Add auth check similar to other pages.

### 18. **Missing Cleanup in useEffect**
**Locations**: All useEffect hooks
**Issue**: No cleanup functions for subscriptions or async operations.
**Fix**: Add cleanup functions where needed (especially for async operations).

### 19. **Time String Parsing Edge Cases**
**Locations**: 
- `app/timetable/page.tsx:74-75, 88-96`
- `app/mark/page.tsx:77-78`
**Issue**: Uses `.slice(0, 5)` on time strings without validation. Will fail if string is shorter than 5 characters or in different format.
**Fix**: Add format validation, error handling, and use proper time parsing.

### 20. **Missing Error Boundaries**
**Issue**: No React error boundaries to catch and display errors gracefully.
**Fix**: Add error boundary component.

## 🟢 Low Priority / UI Improvements

### 21. **Inconsistent Error Messages**
**Issue**: Some use `alert()`, others use inline messages. Inconsistent UX.
**Fix**: Standardize error display (toast notifications or inline messages).

### 22. **Missing Success Feedback**
**Locations**: 
- `app/subjects/page.tsx:72-75` - No success message
- `app/timetable/page.tsx:148-159` - No success feedback
**Fix**: Add success indicators.

### 23. **Date Format Inconsistency**
**Issue**: Mix of date formats across the app (ISO strings, Date objects, formatted strings).
**Fix**: Standardize date handling.

### 24. **Missing Empty States**
**Locations**: Some pages show "No data" but could have better empty states.
**Fix**: Improve empty state designs.

### 25. **Debug Section in Production**
**Location**: `app/analytics/page.tsx:317-336`
**Issue**: Debug section visible to all users in production.
**Fix**: Only show in development mode or remove.

### 26. **Missing Confirmation for Destructive Actions**
**Location**: `app/subjects/page.tsx:79-88` - Only has confirm(), but could be better UX
**Issue**: Browser confirm() is not user-friendly.
**Fix**: Use custom modal component.

### 27. **Time Format Toggle Persistence**
**Location**: `app/timetable/page.tsx:98-102`
**Issue**: Uses localStorage but doesn't handle SSR properly (already mentioned in #2).
**Fix**: See issue #2.

### 28. **Missing Semester End Date Validation**
**Location**: `app/analytics/page.tsx:84`
**Issue**: Only checks start date, doesn't validate end date or handle past end dates.
**Fix**: Add end date validation and handling.

### 29. **Potential Memory Leaks**
**Issue**: Multiple async operations without cleanup could cause memory leaks.
**Fix**: Add proper cleanup and cancellation tokens.

### 30. **Missing Optimistic Updates**
**Issue**: UI doesn't update optimistically, users wait for server response.
**Fix**: Add optimistic updates for better UX.

## 📋 Summary

**Total Issues Found**: 30
- **Critical**: 5
- **High Priority**: 5  
- **Medium Priority**: 10
- **Low Priority**: 10

**Recommended Fix Order**:
1. Fix critical issues first (especially #1, #2, #3, #4)
2. Address high priority issues
3. Improve type safety and error handling
4. Enhance UX and accessibility
