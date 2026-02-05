# GPS-Verified Proof of Attendance Feature

## Overview
BunkSafe v2.0 introduces a **GPS-Verified "Proof of Attendance"** feature that allows students to capture photographic evidence of their attendance with embedded GPS coordinates and timestamps. This feature ensures authenticity and prevents attendance fraud.

---

## Features

### 📸 Camera-Only Capture
- **Direct camera access** using HTML5 `capture="environment"` attribute
- **No gallery access** - users must take a live photo (no pre-existing images)
- Works on both **Android Chrome** and **iOS Safari**

### 🗺️ GPS Watermarking
- Real-time GPS coordinates embedded into the image
- Precise latitude and longitude (6 decimal places)
- High-accuracy location (enableHighAccuracy: true)
- Timeout handling (10 seconds)

### ⏰ Timestamp Verification
- Current date and time burned into the image
- Format: DD-MM-YYYY | HH:MM (24-hour)
- Cannot be edited or tampered with

### 🎨 Professional Watermark Design
- Semi-transparent black footer (75% opacity)
- **BunkSafe Verified Proof** label
- Color-coded metadata:
  - 🕐 Timestamp (Yellow)
  - 📍 GPS Coordinates (Green)
  - 📚 Subject Name (Blue)
- Clean, minimalist design matching app aesthetic

### 💾 Storage & Optimization
- Images converted to **WebP format** for efficiency
- Stored in Supabase Storage bucket: `attendance_proofs`
- Row-Level Security (RLS) enforced
- File naming: `{user_id}/{date}_{subject_id}_{timestamp}.webp`
- Maximum file size: 5MB

---

## User Flow

### 1. Mark Attendance Page
```
1. Navigate to "Mark Attendance"
2. Select status (Present/Absent/Cancelled) for each class
3. Click "Capture Proof (Optional)" button on any class
```

### 2. Proof Capture Process
```
1. Permission Request:
   ├─ Camera Access Required
   └─ GPS Location Required

2. Capture Photo:
   ├─ Camera opens directly (no gallery)
   ├─ User takes photo
   └─ GPS coordinates retrieved simultaneously

3. Image Processing:
   ├─ Watermark added with metadata
   ├─ Converted to WebP format
   └─ Preview shown to user

4. Confirmation:
   ├─ User reviews watermarked image
   ├─ Option to retake or confirm
   └─ Proof attached to class
```

### 3. Viewing Proofs
```
1. On mark attendance page:
   ├─ "View Proof" button appears if proof exists
   └─ Click to view watermarked image in modal

2. Proof Management:
   ├─ Remove proof before saving
   └─ Replace with new proof
```

---

## Technical Implementation

### Database Schema
```sql
-- Added to attendance_logs table
ALTER TABLE attendance_logs 
ADD COLUMN proof_url TEXT;

-- Index for performance
CREATE INDEX idx_attendance_logs_proof_url 
ON attendance_logs(proof_url) 
WHERE proof_url IS NOT NULL;
```

### Storage Bucket
```
Bucket Name: attendance_proofs
Public Access: false (RLS enforced)
File Size Limit: 5MB
Allowed Types: image/webp, image/jpeg, image/png
```

### RLS Policies
```sql
-- Users can upload their own proofs
CREATE POLICY "Users can upload attendance proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own proofs
CREATE POLICY "Users can view their attendance proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own proofs
CREATE POLICY "Users can delete their attendance proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attendance_proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Component Structure
```
components/
└── ProofCapture.tsx       # Camera capture & GPS watermarking

app/
└── mark/
    └── page.tsx           # Integrated proof capture UI
```

---

## Permission Handling

### Android (AndroidManifest.xml)
```xml
<!-- Camera -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- GPS -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### Browser Permissions
- **Camera**: Requested when user clicks "Open Camera"
- **Location**: Requested when photo is taken
- **Graceful Degradation**: Clear error messages if permissions denied

---

## Error Handling

### Permission Denied
```
"Location access denied. Please enable location permissions 
in your device settings."
```

### Location Unavailable
```
"Location information unavailable. Please check your GPS settings."
```

### Upload Failure
```
"Failed to upload proof for {Subject Name}"
```

### Processing Error
```
"Failed to process image. Please try again."
```

---

## Security Features

### 1. Tamper-Proof Watermarking
- Metadata burned directly into image pixels
- Cannot be removed without destroying the image
- Semi-transparent overlay ensures photo visibility

### 2. Storage Security
- Row-Level Security (RLS) enforced
- Users can only access their own proofs
- Folder structure: `{user_id}/` prevents cross-access

### 3. No Gallery Access
- `capture="environment"` forces live photo
- Prevents users from uploading old/fake images
- Timestamp verification ensures current date/time

### 4. High-Accuracy GPS
- `enableHighAccuracy: true` option
- Prevents location spoofing (to reasonable extent)
- 10-second timeout prevents indefinite waiting

---

## UI/UX Design

### Neo-Brutalist Aesthetic
- **Bold borders** (3px black)
- **Thick shadows** for depth
- **Bright colors** (purple for proof button)
- **Professional typography** (system fonts)
- **Clear visual hierarchy**

### Mobile Optimization
- Responsive design (works on all screen sizes)
- Touch-friendly buttons
- Modal overlays for capture/view
- Loading states with spinners

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Clear error messaging
- High contrast colors

---

## Performance Considerations

### Image Optimization
- **WebP format**: 25-35% smaller than JPEG
- **Compression**: 0.9 quality (high but efficient)
- **Canvas processing**: Client-side (no server load)

### Storage Efficiency
- 5MB file limit per proof
- Automatic cleanup on re-upload
- Lazy loading of proof images

### Network Optimization
- Upload only on save (not immediate)
- Batch uploads with attendance logs
- Error retry logic

---

## Migration Guide

### For Existing Users
1. Run migration: `database/migrations/009_add_proof_of_attendance.sql`
2. Create storage bucket in Supabase Dashboard (if not auto-created)
3. No data loss - existing attendance logs remain unchanged
4. Proof capture is **optional** - app works without it

### For Administrators
1. **Supabase Dashboard** → Storage → Create Bucket:
   - Name: `attendance_proofs`
   - Public: No
   - File size limit: 5MB
   - Allowed types: image/webp, image/jpeg, image/png

2. Verify RLS policies are active
3. Test with a sample upload

---

## Testing Checklist

### ✅ Functionality
- [ ] Camera opens on button click
- [ ] GPS coordinates captured correctly
- [ ] Watermark displays all metadata
- [ ] Image converts to WebP
- [ ] Upload to storage successful
- [ ] View proof modal displays image
- [ ] Remove proof works correctly
- [ ] Save persists proof URL in database

### ✅ Permissions
- [ ] Camera permission requested properly
- [ ] GPS permission requested properly
- [ ] Error messages display on denial
- [ ] Fallback behavior on iOS Safari
- [ ] Android Chrome compatibility

### ✅ Edge Cases
- [ ] GPS unavailable (indoor/blocked)
- [ ] Camera blocked by user
- [ ] Slow network upload
- [ ] Large image file handling
- [ ] Multiple proofs same day

---

## Known Limitations

1. **GPS Accuracy**: Indoor locations may have reduced accuracy
2. **iOS Limitations**: iOS Safari has stricter camera/GPS policies
3. **WebP Support**: Very old browsers may not support WebP (fallback to JPEG/PNG)
4. **File Size**: Large images may take time to upload on slow networks
5. **Spoofing**: Determined users with rooted devices could potentially spoof GPS

---

## Future Enhancements

- [ ] Geofencing: Verify user is within campus boundaries
- [ ] Face recognition: Ensure photo includes student's face
- [ ] Blockchain: Store proof hashes on blockchain for immutability
- [ ] Analytics: Track proof upload rates per subject
- [ ] Bulk proof download: Export all proofs as ZIP
- [ ] Admin verification: Manual review of suspicious proofs

---

## Support

### Troubleshooting

**Camera won't open**
```
1. Check browser permissions (Settings > Privacy > Camera)
2. Ensure HTTPS connection (required for camera access)
3. Try different browser (Chrome recommended)
```

**GPS not working**
```
1. Enable Location Services in device settings
2. Grant browser location permission
3. Move to area with clear GPS signal
```

**Upload failing**
```
1. Check internet connection
2. Verify storage bucket exists in Supabase
3. Check RLS policies are active
4. Ensure file size under 5MB
```

---

## Version History

### v2.0 (Current)
- Initial release of GPS-Verified Proof of Attendance
- Camera-only capture with HTML5
- GPS watermarking with Canvas API
- WebP optimization
- Neo-Brutalist UI design

---

## Credits

**Feature Design & Implementation**: Thomas George  
**Framework**: Next.js 16 + React 19 + TypeScript  
**Backend**: Supabase (PostgreSQL + Storage)  
**Styling**: Tailwind CSS 4 + Neo-Brutalism  
**Mobile**: Capacitor 8 for Android/iOS  

---

## License

This feature is part of BunkSafe, a personal attendance tracking application.  
© 2026 Thomas George. All rights reserved.
