const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /monitors
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM monitors ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

/**
 * POST /monitors
 * body: { "url": "https://example.com" }
 */
router.post("/", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO monitors (url) VALUES ($1) RETURNING *",
      [url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
  console.error("❌ DB ERROR:", err.message);
  res.status(500).json({ error: err.message });
}

});

module.exports = router;
