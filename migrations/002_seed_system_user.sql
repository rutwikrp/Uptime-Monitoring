
 -- 002_seed_system_user.sql
 -- Seed a sentinel system user for local/dev so FK constraints don't block inserts
 -- NOTE: This is safe to run repeatedly (uses ON CONFLICT DO NOTHING).
 
 INSERT INTO users (id, email, password_hash)
 VALUES ('00000000-0000-0000-0000-000000000000', 'system@local', '')
 ON CONFLICT (id) DO NOTHING;
 

