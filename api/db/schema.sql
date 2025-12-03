-- Database Schema for Uptime Monitor

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monitors table
CREATE TABLE monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    check_interval INT DEFAULT 60, -- seconds
    alert_email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_status VARCHAR(10) DEFAULT 'UNKNOWN', -- UP, DOWN, UNKNOWN
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_interval CHECK (check_interval >= 30)
);

-- Uptime logs table
CREATE TABLE uptime_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL, -- UP, DOWN
    response_time INT, -- milliseconds (NULL if down)
    status_code INT, -- HTTP status code
    error_message TEXT, -- Error details if down
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_monitors_user_id ON monitors(user_id);
CREATE INDEX idx_monitors_active ON monitors(is_active) WHERE is_active = true;
CREATE INDEX idx_uptime_logs_monitor_id ON uptime_logs(monitor_id);
CREATE INDEX idx_uptime_logs_checked_at ON uptime_logs(checked_at DESC);

-- Function to calculate uptime percentage
CREATE OR REPLACE FUNCTION calculate_uptime(monitor_uuid UUID, hours INT DEFAULT 24)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_checks INT;
    up_checks INT;
BEGIN
    SELECT COUNT(*) INTO total_checks
    FROM uptime_logs
    WHERE monitor_id = monitor_uuid
    AND checked_at >= NOW() - (hours || ' hours')::INTERVAL;
    
    IF total_checks = 0 THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*) INTO up_checks
    FROM uptime_logs
    WHERE monitor_id = monitor_uuid
    AND status = 'UP'
    AND checked_at >= NOW() - (hours || ' hours')::INTERVAL;
    
    RETURN ROUND((up_checks::DECIMAL / total_checks::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
INSERT INTO users (email, password_hash) VALUES 
('demo@example.com', '$2b$10$abcdefghijklmnopqrstuv'); -- password: demo123

INSERT INTO monitors (user_id, name, url, check_interval, alert_email) VALUES 
((SELECT id FROM users WHERE email = 'demo@example.com'), 
 'Google', 
 'https://www.google.com', 
 60, 
 'demo@example.com'),
((SELECT id FROM users WHERE email = 'demo@example.com'), 
 'GitHub', 
 'https://github.com', 
 60, 
 'demo@example.com');
