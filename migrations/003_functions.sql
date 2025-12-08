-- 003_functions.sql
-- Helper function calculate_uptime(monitor_uuid, hours)
-- Returns numeric percentage (0-100) rounded to 2 decimals.

-- Drop any previous version to avoid "cannot change name of input parameter" errors.
DROP FUNCTION IF EXISTS calculate_uptime(uuid, integer);

CREATE FUNCTION calculate_uptime(p_monitor UUID, p_hours INT)
RETURNS NUMERIC AS $$
  SELECT CASE WHEN total = 0 THEN 0
              ELSE round((up::numeric / total::numeric) * 100, 2)
         END
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE checked_at >= now() - (p_hours || ' hours')::interval) AS total,
      COUNT(*) FILTER (WHERE status = 'UP' AND checked_at >= now() - (p_hours || ' hours')::interval) AS up
    FROM uptime_logs
    WHERE monitor_id = p_monitor
  ) t;
$$ LANGUAGE SQL STABLE;
