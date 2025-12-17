console.log("🔥🔥 RUNNING SERVER FILE:", __filename);
require("dotenv").config();
const app = require("./app");
const pool = require("./db");
const { checkOnce } = require("./services/checker");

const PORT = process.env.PORT || 3000;
const CHECK_INTERVAL_MS = 60_000;

let server;
let checkerInterval;

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ DB ready at startup");

    console.log("🧠 Before listen, server =", server);

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      //setInterval(checkOnce, CHECK_INTERVAL_MS);
    });
    console.log("🧠 After listen, server =", server);
    checkerInterval = setInterval(checkOnce, CHECK_INTERVAL_MS);

    console.log("🧠 Server object:", typeof server);
  } catch (err) {
    console.error("❌ DB not available at startup:", err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`);

  // Stop checker
  if (checkerInterval) {
    clearInterval(checkerInterval);
    console.log("⏹ Checker stopped");
  }

  // Stop accepting new HTTP connections
  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        console.log("🚫 HTTP server closed");
        resolve();
      });
    });
  }

  // Close DB connections
  try {
    await pool.end();
    console.log("🔌 DB pool closed");
  } catch (err) {
    console.error("❌ Error closing DB pool:", err.message);
  }

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
start();