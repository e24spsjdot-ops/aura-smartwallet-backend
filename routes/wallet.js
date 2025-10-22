// routes/wallet.js - Wallet-related API endpoints
import express from 'express';
import { WalletController } from '../controllers/walletController.js';
import { validateWalletAddress } from '../middleware/validators.js';

const router = express.Router();
const walletController = new WalletController();

/**
 * GET /api/wallet/:address
 * Fetch wallet overview including balance, tokens, and basic stats
 */
router.get('/:address', 
  validateWalletAddress,
  walletController.getWalletOverview
);

/**
 * GET /api/wallet/:address/tokens
 * Get detailed token holdings for a wallet
 */
router.get('/:address/tokens',
  validateWalletAddress,
  walletController.getTokenHoldings
);

/**
 * GET /api/wallet/:address/transactions
 * Get recent transaction history
 */
router.get('/:address/transactions',
  validateWalletAddress,
  walletController.getTransactionHistory
);

/**
 * POST /api/wallet/:address/analyze
 * Trigger comprehensive AI analysis of the wallet
 */
router.post('/:address/analyze',
  validateWalletAddress,
  walletController.analyzeWallet
);

/**
 * GET /api/wallet/:address/risk-score
 * Get current risk assessment
 */
router.get('/:address/risk-score',
  validateWalletAddress,
  walletController.getRiskScore
);

export default router;