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

export type Semester = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export type Subject = {
  id: string;
  name: string;
  color_hex: string;
  target_percentage: number;
  semester_id?: string | null;
};

export type TimetableSlot = {
  id: string;
  subject_id: string;
  day_of_week: number;
  slot_type: string;
  start_time?: string | null;
  end_time?: string | null;
  semester_id?: string | null;
};

export type Holiday = {
  date: string;
  name?: string | null;
};

export type AttendanceLog = {
  date: string;
  status: string;
  subject_id?: string | null;
  timetable_slot_id?: string | null;
  semester_id?: string | null;
};

type StudentDataResult = {
  user: { id: string; email?: string | null } | null;
  profile: StudentProfile | null;
  activeSemester: Semester | null;
  subjects: Subject[];
  timetable: TimetableSlot[];
  holidays: Holiday[];
  logs: AttendanceLog[];
  loading: boolean;
  error: string | null;
  refresh: (forceRefresh?: boolean) => Promise<void>;
};

export default function useStudentData(): StudentDataResult {
  const [user, setUser] = useState<StudentDataResult['user']>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
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

  const fetchData = useCallback(async (forceRefresh = false) => {
    const getCachedData = (key: string) => {
      const cached = cache.current.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      return null;
    };

    const setCachedData = (key: string, data: Omit<StudentDataResult, 'loading' | 'error' | 'refresh'>) => {
      cache.current.set(key, { data, timestamp: Date.now() });
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
        setActiveSemester(null);
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
        setActiveSemester(cachedData.activeSemester || null);
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

      // Fetch active semester first (critical for filtering)
      const semesterRes = await fetchWithRetry(
        supabase
          .from('semesters')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('is_active', true)
          .maybeSingle()
      );

      const activeSem = semesterRes?.data || null;
      const activeSemesterId = activeSem?.id || null;

      // Fetch all data in parallel, filtered by active semester if it exists
      const [profileRes, subRes, timeRes, holidayRes, logRes] = await Promise.allSettled([
        fetchWithRetry(supabase.from('profiles').select('*').eq('id', authUser.id).single()),
        activeSemesterId 
          ? fetchWithRetry(supabase.from('subjects').select('*').eq('user_id', authUser.id).eq('semester_id', activeSemesterId).order('name'))
          : fetchWithRetry(supabase.from('subjects').select('*').eq('user_id', authUser.id).order('name')),
        activeSemesterId
          ? fetchWithRetry(supabase.from('timetable_slots').select('*').eq('user_id', authUser.id).eq('semester_id', activeSemesterId).order('day_of_week', { ascending: true }).order('start_time', { ascending: true }))
          : fetchWithRetry(supabase.from('timetable_slots').select('*').eq('user_id', authUser.id).order('day_of_week', { ascending: true }).order('start_time', { ascending: true })),
        fetchWithRetry(supabase.from('holidays').select('*').eq('user_id', authUser.id).order('date')),
        activeSemesterId
          ? fetchWithRetry(supabase.from('attendance_logs').select('*').eq('user_id', authUser.id).eq('semester_id', activeSemesterId).order('date', { ascending: false }))
          : fetchWithRetry(supabase.from('attendance_logs').select('*').eq('user_id', authUser.id).order('date', { ascending: false }))
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

      // Extract data (null-safe)
      const fetchedProfile = profileData.error ? null : profileData.data;
      const fetchedActiveSemester = activeSem || null;
      const fetchedSubjects = subjectsData.error ? [] : (subjectsData.data || []);
      const fetchedTimetable = timetableData.error ? [] : (timetableData.data || []);
      const fetchedHolidays = holidaysData.error ? [] : (holidaysData.data || []);
      const fetchedLogs = logsData.error ? [] : (logsData.data || []);

      setProfile(fetchedProfile);
      setActiveSemester(fetchedActiveSemester);
      setSubjects(fetchedSubjects);
      setTimetable(fetchedTimetable);
      setHolidays(fetchedHolidays);
      setLogs(fetchedLogs);

      // Cache successful results only if all queries succeeded
      const allSuccessful = results.every(r => !r.error);
      if (allSuccessful) {
        setCachedData(cacheKey, {
          user: { id: authUser.id, email: authUser.email },
          profile: fetchedProfile,
          activeSemester: fetchedActiveSemester,
          subjects: fetchedSubjects,
          timetable: fetchedTimetable,
          holidays: fetchedHolidays,
          logs: fetchedLogs
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    user,
    profile,
    activeSemester,
    subjects,
    timetable,
    holidays,
    logs,
    loading,
    error,
    refresh: fetchData // fetchData already accepts forceRefresh parameter
  };
}
