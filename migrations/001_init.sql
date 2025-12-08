
 -- 001_init.sql
 -- Initial schema: users, monitors, uptime_logs, migrations tracking table
 
 -- enable pgcrypto for gen_random_uuid()
 CREATE EXTENSION IF NOT EXISTS pgcrypto;
 
 CREATE TABLE IF NOT EXISTS users (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   email TEXT UNIQUE NOT NULL,
   password_hash TEXT NOT NULL DEFAULT '',
   created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
 );
 
 CREATE TABLE IF NOT EXISTS monitors (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID REFERENCES users(id),
   name TEXT NOT NULL,
   url TEXT NOT NULL,
   check_interval INT NOT NULL DEFAULT 60,
   alert_email TEXT,
   is_active BOOLEAN DEFAULT TRUE,
   last_status TEXT DEFAULT 'UNKNOWN',
   last_checked_at TIMESTAMPTZ,
   created_at TIMESTAMPTZ DEFAULT now()
 );
 
 CREATE TABLE IF NOT EXISTS uptime_logs (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
   status TEXT,
   status_code INT,
   response_time INT,
   error TEXT,
   checked_at TIMESTAMPTZ DEFAULT now()
 );
 
 -- migrations tracking table
 CREATE TABLE IF NOT EXISTS migrations (
   id SERIAL PRIMARY KEY,
   name TEXT UNIQUE NOT NULL,
   applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
 );
 

