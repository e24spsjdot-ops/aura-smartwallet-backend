// routes/analysis.js - AI-powered analysis endpoints
import express from 'express';
import { AnalysisController } from '../controllers/analysisController.js';
import { validateWalletAddress, validateSwapParams } from '../middleware/validators.js';

const router = express.Router();
const analysisController = new AnalysisController();

/**
 * POST /api/analysis/swap-timing
 * 🎯 ENHANCED: Predict optimal timing for token swap with market context
 */
router.post('/swap-timing',
  validateSwapParams,
  analysisController.predictSwapTiming
);

/**
 * POST /api/analysis/transaction-risk
 * 🎯 ENHANCED: Assess risk of a pending transaction with AI warnings
 */
router.post('/transaction-risk',
  analysisController.assessTransactionRisk
);

/**
 * GET /api/analysis/market-insights
 * 🎯 ENHANCED: Get current market insights with AI context
 */
router.get('/market-insights',
  analysisController.getMarketInsights
);

/**
 * GET /api/analysis/portfolio-health/:address
 * 🎯 ENHANCED: Get comprehensive portfolio health score
 */
router.get('/portfolio-health/:address',
  validateWalletAddress,
  analysisController.getPortfolioHealth
);

/**
 * POST /api/analysis/tax-impact
 * 🎯 NEW: Calculate tax implications for a transaction
 */
router.post('/tax-impact',
  analysisController.calculateTaxImpact
);

/**
 * POST /api/analysis/platform-safety
 * 🎯 NEW: Assess safety of a DeFi platform
 */
router.post('/platform-safety',
  analysisController.assessPlatformSafety
);

export default router;