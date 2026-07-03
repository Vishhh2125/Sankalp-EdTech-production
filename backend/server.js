/**
 * Server Entry Point
 * Production-grade Node.js server with cluster support, graceful shutdown and error handling
 */

import 'dotenv/config';
import cluster from 'cluster';
import os from 'os';
import { fileURLToPath } from 'node:url';

import app from './app.js';
import logger from './config/logger.js';
import { validateEnvironment } from './config/env.js';
import {
  initializeDatabase,
  disconnectDatabase,
} from './config/db.js';
import { setupMinioBuckets } from './config/minio-setup.js';
import { initializeMembershipExpiryScheduler } from './workers/membership-expiry.job.js';

const PORT = 3000;

// ─────────────────────────────────────────────────────────────
// Cluster bootstrap
// In production, PM2 handles forking (pm2 start server.js -i 4)
// so IS_PRIMARY will be false on workers and this block is skipped.
// When running without PM2 (e.g. docker / dev), we do a manual
// single-process start — no forking needed there either.
// ─────────────────────────────────────────────────────────────
const MANUAL_CLUSTER = process.env.MANUAL_CLUSTER === 'true';
const CLUSTER_WORKERS = parseInt(process.env.CLUSTER_WORKERS || '4', 10);

if (MANUAL_CLUSTER && cluster.isPrimary) {
  logger.info(`[Cluster] Primary ${process.pid} starting ${CLUSTER_WORKERS} workers`);

  for (let i = 0; i < CLUSTER_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`[Cluster] Worker ${worker.process.pid} exited (${signal || code}). Restarting...`);
    cluster.fork();
  });

} else {
  // ── Worker or non-clustered process — start the HTTP server ──
  startServer();
}

// ─────────────────────────────────────────────────────────────

let server;

async function startServer() {
  try {
    logger.info(`[Worker ${process.pid}] Starting server initialization...`);
    validateEnvironment();

    await initializeDatabase();
    await setupMinioBuckets();

    // Only run the scheduler on worker 0 (or single-process mode) to avoid
    // duplicate cron jobs when multiple workers are alive.
    const workerId = cluster.worker?.id ?? 1;
    if (workerId === 1) {
      initializeMembershipExpiryScheduler();
      logger.info('[Worker] Membership expiry scheduler initialised on this worker');
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✓ Worker ${process.pid} listening on http://localhost:${PORT}`);
      logger.info(`✓ Environment: ${process.env.NODE_ENV}`);
      logger.info(`✓ Health check: http://localhost:${PORT}/health`);
    });

    // Keep-alive tuning — prevents Nginx upstream drops
    server.keepAliveTimeout = 65000;
    server.headersTimeout  = 66000;

    // Long timeout for large admin uploads
    server.requestTimeout = 30 * 60 * 1000;
    server.timeout        = 30 * 60 * 1000;

    setupGracefulShutdown();

    return server;
  } catch (error) {
    logger.error('Failed to start server', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

function setupGracefulShutdown() {
  const gracefulShutdown = async (signal) => {
    logger.info(`\n[Worker ${process.pid}] Received ${signal}, starting graceful shutdown...`);

    if (server) {
      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectDatabase();
          logger.info('✓ Graceful shutdown completed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', { error: error.message });
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Forced shutdown — graceful shutdown timeout exceeded');
        process.exit(1);
      }, 30000);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', { reason, promise: promise.toString() });
    process.exit(1);
  });
}

// Allow direct invocation: `node server.js`
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile && !MANUAL_CLUSTER) {
  // already called above via the else-branch
}

export default startServer;