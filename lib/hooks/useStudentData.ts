'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export type StudentProfile = {
  id: string;
  username?: string | null;
  semester_start?: string | null;
  semester_end?: string | null;
  saturday_offs?: number[] | null;
  weekly_offs?: number[] | null;
};

export type Subject = {
  id: string;
  name: string;
  color_hex: string;
  target_percentage: number;
};

export type TimetableSlot = {
  id: string;
  subject_id: string;
  day_of_week: number;
  slot_type: string;
  start_time?: string | null;
  end_time?: string | null;
};

export type Holiday = {
  date: string;
  name?: string | null;
};

export type AttendanceLog = {
  date: string;
  status: string;
  subject_id?: string | null;
};

type StudentDataResult = {
  user: { id: string; email?: string | null } | null;
  profile: StudentProfile | null;
  subjects: Subject[];
  timetable: TimetableSlot[];
  holidays: Holiday[];
  logs: AttendanceLog[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export default function useStudentData(): StudentDataResult {
  const [user, setUser] = useState<StudentDataResult['user']>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upscaling improvements
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchTime = useRef<number>(0);
  const cache = useRef<Map<string, { data: Omit<StudentDataResult, 'loading' | 'error' | 'refresh'>; timestamp: number }>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const RATE_LIMIT = 1000; // 1 second between requests

  const validateUserId = (userId: string): boolean => {
    return typeof userId === 'string' && userId.length > 0 && userId.length <= 255;
  };

  const sanitizeData = <T>(data: T): T => {
    // Basic input sanitization
    if (typeof data === 'string') {
      return (data as string).trim().substring(0, 1000) as T; // Limit string length
    }
    if (Array.isArray(data)) {
      return (data as Array<unknown>).slice(0, 1000) as T; // Limit array size
    }
    return data;
  };

  const fetchData = useCallback(async (forceRefresh = false) => {
    const getCachedData = (key: string) => {
      const cached = cache.current.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      return null;
    };

    const setCachedData = (key: string, data: Omit<StudentDataResult, 'loading' | 'error' | 'refresh'>) => {
      cache.current.set(key, { data: sanitizeData(data), timestamp: Date.now() });
      // Clean up old cache entries
      if (cache.current.size > 100) {
        const oldestKey = cache.current.keys().next().value;
        if (oldestKey) {
          cache.current.delete(oldestKey);
        }
      }
    };
    const now = Date.now();

    // Rate limiting
    if (!forceRefresh && now - lastFetchTime.current < RATE_LIMIT) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    lastFetchTime.current = now;

    setLoading(true);
    setError(null);

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!authUser || !authUser.id || !validateUserId(authUser.id)) {
        setUser(null);
        setProfile(null);
        setSubjects([]);
        setTimetable([]);
        setHolidays([]);
        setLogs([]);
        setLoading(false);
        return;
      }

      setUser({ id: authUser.id, email: authUser.email });

      const cacheKey = `user_${authUser.id}`;
      const cachedData = forceRefresh ? null : getCachedData(cacheKey);

      if (cachedData) {
        setProfile(cachedData.profile || null);
        setSubjects(cachedData.subjects || []);
        setTimetable(cachedData.timetable || []);
        setHolidays(cachedData.holidays || []);
        setLogs(cachedData.logs || []);
        setLoading(false);
        return;
      }

      // Parallel requests with timeout and error handling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchWithRetry = async (query: any, retries = 3): Promise<any> => {
        for (let i = 0; i < retries; i++) {
          try {
            const result = await Promise.race([
              query,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 10000)
              )
            ]);
            return result;
          } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000)); // Exponential backoff
          }
        }
      };

      const [profileRes, subRes, timeRes, holidayRes, logRes] = await Promise.allSettled([
        fetchWithRetry(supabase.from('profiles').select('*').eq('id', authUser.id).single()),
        fetchWithRetry(supabase.from('subjects').select('*').eq('user_id', authUser.id).order('name')),
        fetchWithRetry(supabase.from('timetable_slots').select('*').eq('user_id', authUser.id).order('day_of_week', { ascending: true }).order('start_time', { ascending: true })),
        fetchWithRetry(supabase.from('holidays').select('*').eq('user_id', authUser.id).order('date')),
        fetchWithRetry(supabase.from('attendance_logs').select('*').eq('user_id', authUser.id).order('date', { ascending: false }))
      ]);

      // Handle partial failures gracefully
      const results = [profileRes, subRes, timeRes, holidayRes, logRes].map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error('Query failed:', result.reason);
          return { data: null, error: result.reason };
        }
      });

      const [profileData, subjectsData, timetableData, holidaysData, logsData] = results;

      // Validate and sanitize data
      const sanitizedProfile = profileData.error ? null : sanitizeData(profileData.data);
      const sanitizedSubjects = subjectsData.error ? [] : sanitizeData(subjectsData.data || []);
      const sanitizedTimetable = timetableData.error ? [] : sanitizeData(timetableData.data || []);
      const sanitizedHolidays = holidaysData.error ? [] : sanitizeData(holidaysData.data || []);
      const sanitizedLogs = logsData.error ? [] : sanitizeData(logsData.data || []);

      setProfile(sanitizedProfile);
      setSubjects(sanitizedSubjects);
      setTimetable(sanitizedTimetable);
      setHolidays(sanitizedHolidays);
      setLogs(sanitizedLogs);

      // Cache successful results only if all queries succeeded
      const allSuccessful = results.every(r => !r.error);
      if (allSuccessful) {
        setCachedData(cacheKey, {
          user: { id: authUser.id, email: authUser.email },
          profile: sanitizedProfile,
          subjects: sanitizedSubjects,
          timetable: sanitizedTimetable,
          holidays: sanitizedHolidays,
          logs: sanitizedLogs
        });
      }

      // Set error if any critical data failed to load
      if (profileData.error && subjectsData.error && timetableData.error) {
        throw new Error('Failed to load critical user data. Please try again.');
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data.';
      setError(message);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [CACHE_TTL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    user,
    profile,
    subjects,
    timetable,
    holidays,
    logs,
    loading,
    error,
    refresh: fetchData
  };
}
