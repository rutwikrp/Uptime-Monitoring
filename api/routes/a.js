const express = require('express');
const cors = require('cors');
const path = require('path');
const { query, queryOne, queryMany } = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint (liveness)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness check (checks DB connectivity)
app.get('/ready', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ready: true });
  } catch (err) {
    console.error('Readiness check failed:', err);
    res.status(503).json({ ready: false, error: 'DB not reachable' });
  }
});

// ==================== MONITORS ENDPOINTS ====================

// Get all monitors for a user
app.get('/api/monitors', async (req, res) => {
  try {
    // For demo, using hardcoded user. In production, get from JWT token
    const userId = req.query.userId || '00000000-0000-0000-0000-000000000000';
    
    const monitors = await queryMany(
      `SELECT 
        m.*,
        (SELECT COUNT(*) FROM uptime_logs WHERE monitor_id = m.id) as total_checks,
        (SELECT AVG(response_time) FROM uptime_logs WHERE monitor_id = m.id AND status = 'UP' AND checked_at >= NOW() - INTERVAL '24 hours') as avg_response_time
       FROM monitors m
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: monitors });
  } catch (error) {
    console.error('Error fetching monitors:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch monitors' });
  }
});

// Get a specific monitor with details
app.get('/api/monitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const monitor = await queryOne(
      `SELECT 
        m.*,
        calculate_uptime(m.id, 24) as uptime_24h,
        calculate_uptime(m.id, 168) as uptime_7d,
        calculate_uptime(m.id, 720) as uptime_30d
       FROM monitors m
       WHERE m.id = $1`,
      [id]
    );

    if (!monitor) {
      return res.status(404).json({ success: false, error: 'Monitor not found' });
    }

    res.json({ success: true, data: monitor });
  } catch (error) {
    console.error('Error fetching monitor:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch monitor' });
  }
});

// Create a new monitor
app.post('/api/monitors', async (req, res) => {
  try {
    const { name, url, checkInterval = 60, alertEmail, userId } = req.body;

    // Validation
    if (!name || !url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and URL are required' 
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid URL format' 
      });
    }

    const monitor = await queryOne(
      `INSERT INTO monitors (user_id, name, url, check_interval, alert_email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId || '00000000-0000-0000-0000-000000000000', name, url, checkInterval, alertEmail]
    );

    res.status(201).json({ success: true, data: monitor });
  } catch (error) {
    console.error('Error creating monitor:', error);
    res.status(500).json({ success: false, error: 'Failed to create monitor' });
  }
});

// Update a monitor
app.put('/api/monitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, checkInterval, alertEmail, isActive } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (url !== undefined) {
      updates.push(`url = $${paramCount++}`);
      values.push(url);
    }
    if (checkInterval !== undefined) {
      updates.push(`check_interval = $${paramCount++}`);
      values.push(checkInterval);
    }
    if (alertEmail !== undefined) {
      updates.push(`alert_email = $${paramCount++}`);
      values.push(alertEmail);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    const monitor = await queryOne(
      `UPDATE monitors SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (!monitor) {
      return res.status(404).json({ success: false, error: 'Monitor not found' });
    }

    res.json({ success: true, data: monitor });
  } catch (error) {
    console.error('Error updating monitor:', error);
    res.status(500).json({ success: false, error: 'Failed to update monitor' });
  }
});

// Delete a monitor
app.delete('/api/monitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM monitors WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Monitor not found' });
    }

    res.json({ success: true, message: 'Monitor deleted' });
  } catch (error) {
    console.error('Error deleting monitor:', error);
    res.status(500).json({ success: false, error: 'Failed to delete monitor' });
  }
});

// ==================== UPTIME LOGS ENDPOINTS ====================

// Get uptime logs for a specific monitor
app.get('/api/monitors/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, hours = 24 } = req.query;

    const logs = await queryMany(
      `SELECT * FROM uptime_logs
       WHERE monitor_id = $1
       AND checked_at >= NOW() - ($2 || ' hours')::INTERVAL
       ORDER BY checked_at DESC
       LIMIT $3`,
      [id, hours, limit]
    );

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

// Get uptime statistics
app.get('/api/monitors/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await queryOne(
      `SELECT 
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE status = 'UP') as up_checks,
        COUNT(*) FILTER (WHERE status = 'DOWN') as down_checks,
        AVG(response_time) FILTER (WHERE status = 'UP') as avg_response_time,
        MIN(response_time) FILTER (WHERE status = 'UP') as min_response_time,
        MAX(response_time) FILTER (WHERE status = 'UP') as max_response_time,
        calculate_uptime($1, 24) as uptime_24h,
        calculate_uptime($1, 168) as uptime_7d,
        calculate_uptime($1, 720) as uptime_30d
       FROM uptime_logs
       WHERE monitor_id = $1`,
      [id]
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// ==================== FRONTEND STATIC FILES ====================

// Serve static frontend from api/public
const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

// SPA fallback: for any non-API route, serve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  res.sendFile(path.join(staticPath, 'index.html'));
});

// ==================== ERROR HANDLING ====================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Readiness:   http://localhost:${PORT}/ready`);
});
