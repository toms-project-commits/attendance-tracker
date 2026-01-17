-- Database indexes for performance optimization in multi-user environment
-- Run this migration on your Supabase database

-- Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_semester_dates ON profiles(semester_start, semester_end);

-- Indexes for subjects table
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_name ON subjects(user_id, name);

-- Indexes for timetable_slots table
CREATE INDEX IF NOT EXISTS idx_timetable_user_id ON timetable_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_user_day ON timetable_slots(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_user_subject ON timetable_slots(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_user_day_time ON timetable_slots(user_id, day_of_week, start_time);

-- Indexes for attendance_logs table
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON attendance_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_logs_user_subject ON attendance_logs(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_date_subject ON attendance_logs(user_id, date, subject_id);

-- Indexes for holidays table
CREATE INDEX IF NOT EXISTS idx_holidays_user_id ON holidays(user_id);
CREATE INDEX IF NOT EXISTS idx_holidays_user_date ON holidays(user_id, date);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_logs_user_date_range ON attendance_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_timetable_user_active ON timetable_slots(user_id, day_of_week, start_time) WHERE slot_type = 'SUBJECT';
