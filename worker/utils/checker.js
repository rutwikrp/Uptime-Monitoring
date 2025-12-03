const axios = require('axios');

/**
 * Check if a URL is up and measure response time
 * @param {string} url - The URL to check
 * @returns {Promise<Object>} - Result object with status, responseTime, statusCode, error
 */
async function checkUrl(url) {
  const startTime = Date.now();
  
  try {
    // Configure axios request with timeout
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx as "up"
      headers: {
        'User-Agent': 'UptimeMonitor/1.0',
      },
    });

    const responseTime = Date.now() - startTime;

    return {
      status: 'UP',
      responseTime,
      statusCode: response.status,
      error: null,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Determine error type
    let errorMessage = 'Unknown error';
    let statusCode = null;

    if (error.response) {
      // Server responded with error status (5xx)
      errorMessage = `HTTP ${error.response.status}`;
      statusCode = error.response.status;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS lookup failed';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
    } else if (error.code === 'ECONNRESET') {
      errorMessage = 'Connection reset';
    } else {
      errorMessage = error.message;
    }

    return {
      status: 'DOWN',
      responseTime: responseTime > 10000 ? null : responseTime,
      statusCode,
      error: errorMessage,
    };
  }
}

/**
 * Check multiple URLs in parallel
 * @param {Array} monitors - Array of monitor objects
 * @returns {Promise<Array>} - Array of check results
 */
async function checkMultipleUrls(monitors) {
  const promises = monitors.map(async (monitor) => {
    const result = await checkUrl(monitor.url);
    return {
      monitorId: monitor.id,
      ...result,
    };
  });

  return Promise.all(promises);
}

/**
 * Determine if an alert should be sent
 * @param {string} currentStatus - Current check status (UP/DOWN)
 * @param {string} lastStatus - Previous status
 * @returns {Object} - Alert info { shouldAlert, alertType }
 */
function shouldSendAlert(currentStatus, lastStatus) {
  // Send alert when status changes
  if (currentStatus === 'DOWN' && lastStatus !== 'DOWN') {
    return { shouldAlert: true, alertType: 'DOWN' };
  }
  
  if (currentStatus === 'UP' && lastStatus === 'DOWN') {
    return { shouldAlert: true, alertType: 'RECOVERED' };
  }

  return { shouldAlert: false, alertType: null };
}

/**
 * Format uptime percentage for display
 * @param {number} uptime - Uptime percentage (0-100)
 * @returns {string} - Formatted uptime string
 */
function formatUptime(uptime) {
  if (uptime === null || uptime === undefined) {
    return 'N/A';
  }
  return `${uptime.toFixed(2)}%`;
}

/**
 * Format response time for display
 * @param {number} responseTime - Response time in milliseconds
 * @returns {string} - Formatted response time
 */
function formatResponseTime(responseTime) {
  if (!responseTime) return 'N/A';
  
  if (responseTime < 1000) {
    return `${responseTime}ms`;
  }
  return `${(responseTime / 1000).toFixed(2)}s`;
}

module.exports = {
  checkUrl,
  checkMultipleUrls,
  shouldSendAlert,
  formatUptime,
  formatResponseTime,
};
