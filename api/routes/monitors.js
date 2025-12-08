// api/routes/monitors.js
const express = require('express');
const router = express.Router();
const db = require('../shared/db'); // your DB helper

// GET /api/monitors
router.get('/', async (req, res) => {
  try {
    const monitors = (await db.query('SELECT * FROM monitors ORDER BY id')).rows;
    // fetch last check per monitor (one query)
    if (monitors.length === 0) return res.json([]);
    const ids = monitors.map(m => m.id);
    const lastChecksQ = `
      SELECT DISTINCT ON (monitor_id) *
      FROM checks
      WHERE monitor_id = ANY($1::int[])
      ORDER BY monitor_id, checked_at DESC
    `;
    const lastRows = (await db.query(lastChecksQ, [ids])).rows;
    const lookup = {};
    lastRows.forEach(r => { lookup[r.monitor_id] = r; });
    const out = monitors.map(m => ({ ...m, last_check: lookup[m.id] || null }));
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// POST /api/monitors
// body: { name?, url, interval_seconds? }
router.post('/', async (req, res) => {
  const { name, url, interval_seconds } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const q = 'INSERT INTO monitors(name, url, interval_seconds) VALUES($1,$2,$3) RETURNING *';
    const r = await db.query(q, [name || url, url, interval_seconds || 60]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'insert failed' });
  }
});

// GET /api/monitors/:id/checks
router.get('/:id/checks', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const rows = (await db.query('SELECT * FROM checks WHERE monitor_id=$1 ORDER BY checked_at DESC LIMIT 200', [id])).rows;
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
