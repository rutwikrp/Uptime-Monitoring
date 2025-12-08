-- 004_add_error_message.sql
-- Add error_message column to uptime_logs for compatibility with worker insertions
ALTER TABLE uptime_logs
  ADD COLUMN IF NOT EXISTS error_message TEXT;
