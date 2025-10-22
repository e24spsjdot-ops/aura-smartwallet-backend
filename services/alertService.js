// services/alertService.js - Alert creation and monitoring
import { AuraService } from './auraService.js';
import { RiskAnalyzer } from './riskAnalyzer.js';

export class AlertService {
  constructor() {
    this.alerts = new Map(); // In production, use a database
    this.activeAlerts = new Map();
    this.auraService = new AuraService();
    this.riskAnalyzer = new RiskAnalyzer();
    
    // Start monitoring loop
    this.startMonitoring();
  }

  /**
   * Create a new alert
   */
  async createAlert(alertData) {
    const alertId = this.generateAlertId();
    
    const alert = {
      id: alertId,
      ...alertData,
      status: 'active',
      triggered: false,
      createdAt: new Date().toISOString()
    };

    this.alerts.set(alertId, alert);
    
    return alert;
  }

  /**
   * Get alerts by wallet address
   */
  async getAlertsByAddress(address) {
    const userAlerts = [];
    
    for (const alert of this.alerts.values()) {
      if (alert.address.toLowerCase() === address.toLowerCase()) {
        userAlerts.push(alert);
      }
    }
    
    return userAlerts;
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId) {
    return this.alerts.delete(alertId);
  }

  /**
   * Get active (triggered) alerts
   */
  async getActiveAlerts(address) {
    const activeAlerts = [];
    
    for (const alert of this.activeAlerts.values()) {
      if (alert.address.toLowerCase() === address.toLowerCase()) {
        activeAlerts.push(alert);
      }
    }
    
    return activeAlerts;
  }

  /**
   * Start monitoring alerts
   */
  startMonitoring() {
    // Check alerts every 30 seconds
    setInterval(async () => {
      await this.checkAlerts();
    }, 30000);

    console.log('📡 Alert monitoring started');
  }

  /**
   * Check all alerts and trigger if conditions are met
   */
  async checkAlerts() {
    for (const alert of this.alerts.values()) {
      if (alert.status !== 'active' || alert.triggered) continue;

      try {
        const shouldTrigger = await this.evaluateAlert(alert);
        
        if (shouldTrigger) {
          await this.triggerAlert(alert);
        }
      } catch (error) {
        console.error(`Error checking alert ${alert.id}:`, error.message);
      }
    }
  }

  /**
   * Evaluate if an alert should trigger
   */
  async evaluateAlert(alert) {
    switch (alert.type) {
      case 'PRICE':
        return await this.evaluatePriceAlert(alert);
      
      case 'RISK':
        return await this.evaluateRiskAlert(alert);
      
      case 'BALANCE':
        return await this.evaluateBalanceAlert(alert);
      
      case 'TRANSACTION':
        return await this.evaluateTransactionAlert(alert);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate price alert
   */
  async evaluatePriceAlert(alert) {
    const { token, condition, value } = alert;
    
    const priceData = await this.auraService.getTokenPrice(token);
    const currentPrice = priceData.current;

    switch (condition) {
      case 'ABOVE':
        return currentPrice > value;
      case 'BELOW':
        return currentPrice < value;
      case 'CHANGE_UP':
        return priceData.change24h > value;
      case 'CHANGE_DOWN':
        return priceData.change24h < -value;
      default:
        return false;
    }
  }

  /**
   * Evaluate risk alert
   */
  async evaluateRiskAlert(alert) {
    const { address, condition, value } = alert;
    
    const tokens = await this.auraService.getTokenBalances(address);
    const riskScore = await this.riskAnalyzer.calculatePortfolioRisk({
      tokens,
      transactions: []
    });

    switch (condition) {
      case 'EXCEEDS':
        return riskScore.score > value;
      case 'BELOW':
        return riskScore.score < value;
      case 'LEVEL':
        return riskScore.level === value;
      default:
        return false;
    }
  }

  /**
   * Evaluate balance alert
   */
  async evaluateBalanceAlert(alert) {
    const { address, token, condition, value } = alert;
    
    const tokens = await this.auraService.getTokenBalances(address);
    const tokenData = tokens.find(t => t.symbol === token);
    
    if (!tokenData) return false;

    switch (condition) {
      case 'ABOVE':
        return tokenData.balance > value;
      case 'BELOW':
        return tokenData.balance < value;
      default:
        return false;
    }
  }

  /**
   * Evaluate transaction alert
   */
  async evaluateTransactionAlert(alert) {
    const { address } = alert;
    
    const transactions = await this.auraService.getTransactions(address, 1);
    
    if (transactions.length === 0) return false;

    const latestTx = transactions[0];
    const txTime = new Date(latestTx.timestamp).getTime();
    const alertTime = new Date(alert.lastChecked || alert.createdAt).getTime();

    // New transaction detected
    if (txTime > alertTime) {
      // Check if it's risky
      const risk = this.riskAnalyzer.assessTransactionRisk(latestTx);
      return risk.level === 'HIGH' || risk.level === 'CRITICAL';
    }

    return false;
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(alert) {
    alert.triggered = true;
    alert.triggeredAt = new Date().toISOString();
    
    this.activeAlerts.set(alert.id, alert);
    
    console.log(`🔔 Alert triggered: ${alert.type} for ${alert.address}`);
    
    // In production, send notifications here:
    // - Email
    // - Push notification
    // - Webhook
    // - SMS

    // For demo, just log it
    this.notifyUser(alert);
  }

  /**
   * Notify user about triggered alert
   */
  notifyUser(alert) {
    const notification = {
      alertId: alert.id,
      type: alert.type,
      message: this.getAlertMessage(alert),
      severity: this.getAlertSeverity(alert),
      timestamp: new Date().toISOString()
    };

    console.log('📬 Notification:', notification);
    
    // Store notification for retrieval
    // In production, use a proper notification service
  }

  /**
   * Generate alert message
   */
  getAlertMessage(alert) {
    switch (alert.type) {
      case 'PRICE':
        return `${alert.token} price ${alert.condition} ${alert.value}`;
      case 'RISK':
        return `Portfolio risk ${alert.condition} threshold`;
      case 'BALANCE':
        return `${alert.token} balance ${alert.condition} ${alert.value}`;
      case 'TRANSACTION':
        return `Risky transaction detected on your wallet`;
      default:
        return 'Alert triggered';
    }
  }

  /**
   * Determine alert severity
   */
  getAlertSeverity(alert) {
    if (alert.type === 'TRANSACTION' || alert.type === 'RISK') {
      return 'high';
    }
    return 'medium';
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}