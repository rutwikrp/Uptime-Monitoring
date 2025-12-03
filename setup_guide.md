# Day 1 Setup Guide - Uptime Monitor

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

## Step 1: Install PostgreSQL

### macOS (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Windows
Download from: https://www.postgresql.org/download/windows/

## Step 2: Create Database

```bash
# Access PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE uptime_monitor;
CREATE USER monitor_user WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE uptime_monitor TO monitor_user;

# Exit
\q
```

## Step 3: Project Setup

```bash
# Create project structure
mkdir uptime-monitor
cd uptime-monitor

# Create directories
mkdir -p api/routes api/db
mkdir -p worker/utils
mkdir -p shared

# Copy all the files from the artifacts to their respective locations
```

## Step 4: Initialize Database Schema

```bash
# Run the schema SQL
psql -U postgres -d uptime_monitor -f api/db/schema.sql
```

## Step 5: Install Dependencies

```bash
# Install API dependencies
cd api
npm install

# Install Worker dependencies
cd ../worker
npm install

# Install shared dependencies
cd ../shared
npm install pg dotenv
```

## Step 6: Configure Environment

Create `.env` file in the root directory (already provided in artifacts)

## Step 7: Run the Application

### Terminal 1 - Start API Server
```bash
cd api
node server.js

# Or with auto-reload during development:
npm run dev
```

Expected output:
```
✅ Connected to PostgreSQL database
🚀 API Server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
```

### Terminal 2 - Start Worker
```bash
cd worker
node worker.js

# Or with auto-reload:
npm run dev
```

Expected output:
```
🤖 Uptime Monitor Worker Starting...
⏱️  Check interval: 30000ms
🔀 Max concurrent checks: 10

📊 Checking 2 monitors...
Checking: Google (https://www.google.com)
  ✅ UP - 145ms - HTTP 200
Checking: GitHub (https://github.com)
  ✅ UP - 234ms - HTTP 200
✓ Completed 2 checks in 567ms
```

## Step 8: Test the API

### Check Health
```bash
curl http://localhost:3000/health
```

### Get All Monitors
```bash
curl http://localhost:3000/api/monitors
```

### Create a New Monitor
```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Website",
    "url": "https://example.com",
    "checkInterval": 60,
    "alertEmail": "your@email.com"
  }'
```

### Get Monitor Logs
```bash
# Replace {id} with actual monitor ID
curl http://localhost:3000/api/monitors/{id}/logs
```

### Get Monitor Statistics
```bash
curl http://localhost:3000/api/monitors/{id}/stats
```

## Project Structure

```
uptime-monitor/
├── api/
│   ├── server.js              # Express API server
│   ├── db/
│   │   └── schema.sql         # Database schema
│   └── package.json
├── worker/
│   ├── worker.js              # Main worker script
│   ├── utils/
│   │   └── checker.js         # URL checking logic
│   └── package.json
├── shared/
│   └── db.js                  # Shared database connection
└── .env                       # Environment variables
```

## Verification Checklist

- [ ] PostgreSQL is running
- [ ] Database `uptime_monitor` exists
- [ ] Schema is loaded (tables created)
- [ ] API server starts without errors
- [ ] Worker starts without errors
- [ ] Sample monitors are being checked
- [ ] Logs are being saved to database

## Troubleshooting

### Database Connection Fails
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/uptime_monitor
```

### Worker Not Checking Monitors
- Verify monitors exist in database: `SELECT * FROM monitors;`
- Check `is_active` is true
- Check worker logs for errors

### API Returns Empty Data
- Check database has sample data: `SELECT * FROM monitors;`
- Verify userId in requests matches database

## What's Working Now

✅ Database schema with proper relationships  
✅ API server with full CRUD operations  
✅ Worker checking URLs every 30 seconds  
✅ Logging uptime/downtime to database  
✅ Response time tracking  
✅ Uptime percentage calculations  
✅ Alert detection (logging only, no emails yet)

## Next Steps (Day 2)

- Create simple web dashboard
- Add user authentication
- Dockerize the application
- Set up Docker Compose

## Monitoring the System

Watch the worker in real-time:
```bash
cd worker
npm run dev
```

Query recent checks:
```sql
SELECT 
  m.name,
  ul.status,
  ul.response_time,
  ul.checked_at
FROM uptime_logs ul
JOIN monitors m ON m.id = ul.monitor_id
ORDER BY ul.checked_at DESC
LIMIT 20;
```