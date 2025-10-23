// server.js - Main Express Server Entry Point
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route imports
import walletRoutes from './routes/wallet.js';
import analysisRoutes from './routes/analysis.js';
import alertRoutes from './routes/alerts.js';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

console.log("OpenAI key found:", !!process.env.OPENAI_API_KEY);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://aura-smartwallet-ai.netlify.app'
  ],
  credentials: true
}));


// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(requestLogger);

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AURA SmartWallet AI Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
