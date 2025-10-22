// routes/alerts.js - Alert management endpoints
import express from 'express';
import { AlertController } from '../controllers/alertController.js';
import { validateWalletAddress } from '../middleware/validators.js';

const router = express.Router();
const alertController = new AlertController();

/**
 * POST /api/alerts/create
 * Create a new price or risk alert
 */
router.post('/create',
  alertController.createAlert
);

/**
 * GET /api/alerts/:address
 * Get all alerts for a wallet address
 */
router.get('/:address',
  validateWalletAddress,
  alertController.getAlerts
);

/**
 * DELETE /api/alerts/:alertId
 * Delete a specific alert
 */
router.delete('/:alertId',
  alertController.deleteAlert
);

/**
 * GET /api/alerts/:address/active
 * Get active (triggered) alerts for a wallet
 */
router.get('/:address/active',
  validateWalletAddress,
  alertController.getActiveAlerts
);

export default router;