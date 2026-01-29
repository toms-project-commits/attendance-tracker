import { Capacitor } from '@capacitor/core';

/**
 * Utility functions for Capacitor platform detection
 * Use these to conditionally apply platform-specific behavior
 */

/**
 * Check if the app is running as a native platform (Android/iOS)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if the app is running on Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if the app is running on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if the app is running on web
 */
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Get the current platform name
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Check if a specific plugin is available
 */
export const isPluginAvailable = (pluginName: string): boolean => {
  return Capacitor.isPluginAvailable(pluginName);
};
