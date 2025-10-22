// controllers/alertController.js - Alert management logic
import { AlertService } from '../services/alertService.js';

export class AlertController {
  constructor() {
    this.alertService = new AlertService();
  }

  /**
   * Create a new alert
   */
  createAlert = async (req, res, next) => {
    try {
      const { address, type, condition, value, token } = req.body;

      // Validate required fields
      if (!address || !type || !condition || !value) {
        return res.status(400).json({
          error: 'Missing required fields: address, type, condition, value'
        });
      }

      const alert = await this.alertService.createAlert({
        address,
        type,
        condition,
        value,
        token,
        createdAt: new Date().toISOString()
      });

      res.status(201).json({
        message: 'Alert created successfully',
        alert
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all alerts for an address
   */
  getAlerts = async (req, res, next) => {
    try {
      const { address } = req.params;
      
      const alerts = await this.alertService.getAlertsByAddress(address);

      res.json({
        address,
        alerts,
        total: alerts.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete an alert
   */
  deleteAlert = async (req, res, next) => {
    try {
      const { alertId } = req.params;

      const deleted = await this.alertService.deleteAlert(alertId);

      if (!deleted) {
        return res.status(404).json({
          error: 'Alert not found'
        });
      }

      res.json({
        message: 'Alert deleted successfully',
        alertId
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get active (triggered) alerts
   */
  getActiveAlerts = async (req, res, next) => {
    try {
      const { address } = req.params;

      const activeAlerts = await this.alertService.getActiveAlerts(address);

      res.json({
        address,
        activeAlerts,
        count: activeAlerts.length
      });
    } catch (error) {
      next(error);
    }
  };
}