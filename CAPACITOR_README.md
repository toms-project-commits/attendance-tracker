# BunkSafe - Capacitor Mobile App Setup

This document describes how the BunkSafe web app was transformed into an Android app using Capacitor.

---

## 📱 HOW TO INSTALL THE APP ON YOUR PHONE

### Option 1: Quick Test with USB Debugging (Recommended for Developers)

**Requirements:**
- Android phone with USB Debugging enabled
- USB cable
- Android Studio installed on your computer

**Steps:**
1. Enable Developer Options on your phone:
   - Go to Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → Enable "USB Debugging"
3. Connect your phone via USB cable
4. Run this command:
   ```bash
   npm run cap:run:android
   ```
5. The app will be installed and launched automatically!

### Option 2: Generate APK File (Share with anyone)

**Steps:**
1. Open Android Studio:
   ```bash
   npm run cap:open:android
   ```
2. Wait for Gradle sync to complete (first time takes ~5 minutes)
3. Go to: Build → Build Bundle(s) / APK(s) → Build APK(s)
4. Wait for build to complete
5. Click "locate" in the notification or find APK at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
6. Transfer this APK to your phone (via email, Google Drive, USB, etc.)
7. On your phone, open the APK file and tap "Install"
   - You may need to enable "Install from Unknown Sources" in Settings

### Option 3: Generate Signed Release APK (For Play Store)

1. Open Android Studio: `npm run cap:open:android`
2. Go to: Build → Generate Signed Bundle / APK
3. Select "APK" and click Next
4. Create a new keystore or use existing one
5. Fill in key details and click Next
6. Select "release" build variant
7. Click "Create"
8. APK will be at: `android/app/release/app-release.apk`

---

## Overview

- **App Name:** BunkSafe
- **App ID:** com.thomasgeorge.bunksafe
- **Web Directory:** out (Next.js static export)
- **Capacitor Version:** 8.0.1

## Project Structure

```
attendance-tracker/
├── android/                 # Native Android project
├── out/                     # Static export output (build target)
├── capacitor.config.ts      # Capacitor configuration
├── lib/capacitor.ts         # Platform detection utilities
└── ...
```

## Changes Made for Mobile Compatibility

### 1. next.config.ts
- Added `output: "export"` for static site generation
- Added `images: { unoptimized: true }` for static export compatibility
- Added `trailingSlash: true` for proper static file routing

### 2. app/layout.tsx
- Removed `next/font/google` (incompatible with static export)
- Added Google Fonts via CDN (`<link>` tags)
- Added `viewportFit: 'cover'` for safe-area support
- Added `safe-area-padding` class to body

### 3. app/globals.css
- Added `.safe-area-padding` utility class
- Added `.native-safe-top` and `.native-safe-bottom` utilities
- Uses `env(safe-area-inset-*)` for notched device support

### 4. lib/supabase.ts
- Already configured with `localStorage` for session persistence (mobile-ready)

## NPM Scripts

```bash
# Web Development
npm run dev              # Start Next.js dev server
npm run build            # Build static site to /out

# Mobile Development
npm run build:mobile     # Build + sync to native platforms
npm run cap:sync         # Sync web assets to native platforms
npm run cap:open:android # Open Android project in Android Studio
npm run cap:run:android  # Build and run on connected device/emulator
npm run cap:doctor       # Check Capacitor installation health
```

## Development Workflow

### Building for Mobile

1. Make changes to your web app
2. Run `npm run build:mobile` to build and sync
3. Run `npm run cap:open:android` to open in Android Studio
4. Build APK/AAB from Android Studio

### Testing on Device

1. Connect Android device with USB debugging enabled
2. Run `npm run cap:run:android`
3. App will be installed and launched on device

## Platform Detection

Use the utilities in `lib/capacitor.ts` for platform-specific behavior:

```typescript
import { isNativePlatform, isAndroid, isWeb } from '@/lib/capacitor';

// Conditionally apply native-only features
if (isNativePlatform()) {
  // Native Android/iOS specific code
}

if (isAndroid()) {
  // Android-specific code
}

if (isWeb()) {
  // Web-only code
}
```

## Safe Area Handling

The app automatically handles safe areas (notches, home indicators) using CSS:

```css
/* Applied to body in layout.tsx */
.safe-area-padding {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

## Requirements for Building APK

1. **Android Studio** - Download from https://developer.android.com/studio
2. **JDK 17+** - Usually bundled with Android Studio
3. **Android SDK** - Install via Android Studio SDK Manager
4. **Gradle** - Bundled with Android Studio

## Building Release APK

1. Open `android/` folder in Android Studio
2. Go to Build → Generate Signed Bundle/APK
3. Create or use existing keystore
4. Select APK and release build variant
5. APK will be generated in `android/app/release/`

## Environment Variables

For the mobile app to connect to Supabase, ensure your `.env.local` variables are baked into the build:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Note:** `NEXT_PUBLIC_*` variables are embedded at build time and included in the static output.

## Troubleshooting

### Build fails with font error
The app uses Google Fonts via CDN to avoid `next/font` issues with static export.

### Authentication not persisting
Supabase is configured to use `localStorage` which works on both web and native.

### Safe area not working
Ensure `viewportFit: 'cover'` is set in the viewport meta tag (handled in layout.tsx).

### Capacitor sync errors
Run `npm run cap:doctor` to diagnose issues.
