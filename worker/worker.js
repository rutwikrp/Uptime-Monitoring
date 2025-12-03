const { queryMany, query } = require('../shared/db');
const { checkUrl, shouldSendAlert } = require('./utils/checker');

// Configuration
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || 30000; // 30 seconds default
const MAX_CONCURRENT_CHECKS = process.env.MAX_CONCURRENT_CHECKS || 10;

/**
 * Log the check result to database
 */
async function logCheckResult(monitorId, result) {
  try {
    await query(
      `INSERT INTO uptime_logs (monitor_id, status, response_time, status_code, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        monitorId,
        result.status,
        result.responseTime,
        result.statusCode,
        result.error,
      ]
    );

    // Update monitor's last status and last checked time
    await query(
      `UPDATE monitors 
       SET last_status = $1, last_checked_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [result.status, monitorId]
    );

    console.log(`✓ Logged check for monitor ${monitorId}: ${result.status}`);
  } catch (error) {
    console.error(`Failed to log check result for monitor ${monitorId}:`, error);
  }
}

/**
 * Send alert notification (placeholder for now)
 */
async function sendAlert(monitor, alertType) {
  // TODO: Implement actual email/SMS/webhook alerts
  console.log(`🚨 ALERT: ${monitor.name} (${monitor.url}) is ${alertType}`);
  console.log(`   Alert email: ${monitor.alert_email}`);
  
  // In production, you would:
  // - Send email via SendGrid/AWS SES
  // - Send SMS via Twilio
  // - Send webhook to Slack/Discord
  // - Send push notification
}

/**
 * Check a single monitor
 */
async function checkMonitor(monitor) {
  console.log(`Checking: ${monitor.name} (${monitor.url})`);
  
  const result = await checkUrl(monitor.url);
  
  // Log to database
  await logCheckResult(monitor.id, result);
  
  // Check if we should send an alert
  const alertInfo = shouldSendAlert(result.status, monitor.last_status);
  if (alertInfo.shouldAlert && monitor.alert_email) {
    await sendAlert(monitor, alertInfo.alertType);
  }
  
  // Log result
  if (result.status === 'UP') {
    console.log(`  ✅ UP - ${result.responseTime}ms - HTTP ${result.statusCode}`);
  } else {
    console.log(`  ❌ DOWN - ${result.error}`);
  }
  
  return result;
}

/**
 * Process monitors in batches to avoid overwhelming the system
 */
async function processBatch(monitors) {
  const results = [];
  
  for (let i = 0; i < monitors.length; i += MAX_CONCURRENT_CHECKS) {
    const batch = monitors.slice(i, i + MAX_CONCURRENT_CHECKS);
    const batchPromises = batch.map(monitor => checkMonitor(monitor));
    const batchResults = await Promise.allSettled(batchPromises);
    
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to target servers
    if (i + MAX_CONCURRENT_CHECKS < monitors.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Main worker loop - fetch and check all active monitors
 */
async function checkAllMonitors() {
  try {
    // Get all active monitors that are due for a check
    const monitors = await queryMany(
      `SELECT * FROM monitors 
       WHERE is_active = true 
       AND (
         last_checked_at IS NULL 
         OR last_checked_at <= NOW() - (check_interval || ' seconds')::INTERVAL
       )
       ORDER BY last_checked_at ASC NULLS FIRST
       LIMIT 100`
    );

    if (monitors.length === 0) {
      console.log('No monitors to check at this time.');
      return;
    }

    console.log(`\n📊 Checking ${monitors.length} monitors...`);
    const startTime = Date.now();
    
    await processBatch(monitors);
    
    const duration = Date.now() - startTime;
    console.log(`✓ Completed ${monitors.length} checks in ${duration}ms\n`);
    
  } catch (error) {
    console.error('❌ Error in checkAllMonitors:', error);
  }
}

/**
 * Start the worker
 */
async function startWorker() {
  console.log('🤖 Uptime Monitor Worker Starting...');
  console.log(`⏱️  Check interval: ${CHECK_INTERVAL}ms`);
  console.log(`🔀 Max concurrent checks: ${MAX_CONCURRENT_CHECKS}`);
  console.log('');

  // Initial check immediately
  await checkAllMonitors();

  // Then check on interval
  setInterval(async () => {
    await checkAllMonitors();
  }, CHECK_INTERVAL);
  
  console.log('✅ Worker is running. Press Ctrl+C to stop.\n');
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the worker
startWorker().catch(error => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
