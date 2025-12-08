
/* scripts/migrate.js
+   Simple migration runner:
+   - reads files from migrations/ (lexical order)
+   - records applied migrations in migrations table
+   - runs each migration in a transaction
+*/
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const DATABASE_URL = process.env.DATABASE_URL || process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/uptime_monitor';

async function main() {
  console.log('Migration runner starting. DB:', DATABASE_URL.split('@').pop());
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Ensure migrations table exists (in case migrations/001_init.sql hasn't run yet)
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Read migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Get already applied migrations
    const res = await client.query('SELECT name FROM migrations ORDER BY id');
    const applied = new Set(res.rows.map(r => r.name));

    for (const file of files) {
      if (applied.has(file)) {
        console.log('Skipping already applied migration:', file);
        continue;
      }

      const fullPath = path.join(MIGRATIONS_DIR, file);
      console.log('Applying migration:', file);
      const sql = fs.readFileSync(fullPath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations(name) VALUES($1)', [file]);
        await client.query('COMMIT');
        console.log('Applied:', file);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to apply', file, err);
        throw err;
      }
    }

    console.log('All migrations applied.');
    await client.end();
  } catch (err) {
    console.error('Migration runner error:', err);
    await client.end();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}


