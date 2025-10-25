// server.js - Main Express Server Entry Point
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import os from 'os';

// ✅ ADD THIS IMPORT
import { CacheService } from './services/cacheService.js';

// Heartbeat
import { HeartbeatService } from './services/heartbeatService.js';

// Route imports
import walletRoutes from './routes/wallet.js';
import analysisRoutes from './routes/analysis.js';
import alertRoutes from './routes/alerts.js';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

console.log("OpenAI key found:", !!process.env.OPENAI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new CacheService();

const app = express();
app.set('trust proxy', 1);

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// ✅ Allow frontend domain only
app.use(cors({
  origin: "https://aura-smartwallet-ai.netlify.app",
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(requestLogger);

/**
 * ✅ Health + API status endpoint
 * Shows API key status, cache stats, uptime, and memory usage
 */
app.get('/api/status', async (req, res) => {
  try {
    // check if OpenAI API key works
    let keyStatus = 'unknown';
    try {
      await openai.models.list({ limit: 1 });
      keyStatus = 'active';
    } catch (e) {
      keyStatus = 'invalid or exhausted';
    }

    const uptimeMinutes = (process.uptime() / 60).toFixed(1);
    const memory = process.memoryUsage();

    res.json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      keyStatus,
      uptime: `${uptimeMinutes} minutes`,
      cacheSize: (typeof cache.size === 'function') ? await cache.size() : 'N/A',
      system: {
        platform: os.platform(),
        cpuCount: os.cpus().length,
        memoryUsedMB: (memory.rss / 1024 / 1024).toFixed(2),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'AURA SmartWallet AI'
  });
});

// 🟢 Add this root route (for homepage /)
app.get('/', (req, res) => {
  res.json({
    message: "🚀 Welcome to AURA SmartWallet AI Backend",
    status: "running",
    docs: "https://github.com/e24spsjdot-ops/aura-smartwallet-backend#readme",
    health: "/health"
  });
});

// app.get('/api/analysis/test-coingecko', async (req, res) => {
//   try {
//     const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd");
//     const data = await r.json();
//     res.json({ ok: true, data });
//   } catch (e) {
//     res.status(500).json({ ok: false, error: e.message });
//   }
// });

// API Routes
app.use('/api/wallet', walletRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/alerts', alertRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// 🫀 Start heartbeat to keep backend warm & refresh market data
const heartbeat = new HeartbeatService();
heartbeat.start();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AURA SmartWallet AI Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
