/**
 * Application configuration utilities
 * Handles platform-specific settings for web and native (Capacitor) platforms
 */

/**
 * Get the base URL for OAuth redirects and password reset links
 * On native platforms, we need to use the deployed web URL since
 * capacitor://localhost won't work for OAuth callbacks
 */
export const getRedirectUrl = (path: string = ''): string => {
  // For native apps or when running locally without a proper origin,
  // use the configured SITE_URL or fall back to the web app URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // Check if we're on a native platform (Capacitor uses capacitor:// or localhost schemes)
    const isNativeScheme = origin.includes('capacitor://') || 
                          origin.includes('localhost') ||
                          origin === 'null' ||
                          origin === '';
    
    // If on native platform and we have a configured site URL, use it
    if (isNativeScheme && siteUrl) {
      return `${siteUrl}${path}`;
    }
    
    // Otherwise use the current origin (works for web)
    return `${origin}${path}`;
  }
  
  // Server-side fallback
  return siteUrl ? `${siteUrl}${path}` : path;
};

/**
 * Check if the app is running on a native platform
 */
export const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const origin = window.location.origin;
  return origin.includes('capacitor://') || 
         origin === 'null' ||
         origin === '';
};

/**
 * App configuration constants
 */
export const APP_CONFIG = {
  name: 'BunkSafe',
  appId: 'com.thomasgeorge.bunksafe',
  version: '1.0.0',
} as const;
