import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

/**
 * Fetch wrapper with timeout for the Supabase client.
 *
 * The project is hosted in South Asia (Mumbai / ap-south-1) on Supabase.
 * Supabase has had documented connectivity incidents in this region
 * (see status.supabase.com). Adding a 30-second timeout prevents
 * requests from hanging indefinitely during such incidents, giving the
 * user a clear error instead of a frozen UI.
 */
const fetchWithTimeout = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const TIMEOUT_MS = 30_000; // 30 seconds — covers slow connections without over-penalising users

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
};

// Create Supabase client with persistent session support and India-region resilience
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,      // Keep sessions across page reloads
    autoRefreshToken: true,    // Auto refresh tokens before they expire
    detectSessionInUrl: true,  // Support OAuth / email magic-link redirects
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    // Custom fetch with timeout guards against hanging connections.
    // This is especially important for the Mumbai (ap-south-1) region which
    // experienced connectivity incidents. Without a timeout the JS client
    // would wait forever on a dropped connection, freezing the UI.
    fetch: fetchWithTimeout,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    // Increase the reconnection timeout to be more tolerant of brief
    // network disruptions common during regional incidents.
    timeout: 30_000,
  },
});
