// services/heartbeatService.js
import { AIService } from './aiService.js';

export class HeartbeatService {
  constructor() {
    this.ai = new AIService();
    this.interval = null;
  }

  start() {
    console.log("🫀 Heartbeat service started (10-min interval)");
    // Run immediately once
    this.pulse();
    // Then every 10 minutes
    this.interval = setInterval(() => this.pulse(), 10 * 60 * 1000);
  }

  async pulse() {
    try {
      console.log("🔄 Heartbeat ping: refreshing market context...");
      const market = await this.ai.getMarketContext();
      console.log("✅ Market cached:", market.sentiment, "| Risk:", market.riskLevel);
    } catch (err) {
      console.warn("⚠️ Heartbeat error:", err.message);
    }
  }
}
