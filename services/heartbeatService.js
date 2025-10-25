// services/heartbeatService.js
import { AIService } from './aiService.js';

export class HeartbeatService {
  constructor() {
    this.ai = new AIService();
    this.interval = null;

    // ✅ store the last refresh result for API inspection
    this.lastStatus = {
      lastRefreshed: null,
      sentiment: null,
      riskLevel: null,
      message: "Heartbeat not yet started",
    };
  }

  start() {
    console.log("🫀 Heartbeat service started (refresh every 10 minutes)");
    // Run immediately once
    this.pulse();
    // Schedule every 10 minutes
    this.interval = setInterval(() => this.pulse(), 10 * 60 * 1000);
  }

  async pulse() {
    try {
      console.log("🔄 Heartbeat ping → refreshing market context (AURA + CoinGecko)...");
      const market = await this.ai.getMarketContext();

      // Log results clearly
      console.log(
        `✅ Market refreshed @ ${new Date().toISOString()} → Sentiment: ${market.sentiment}, Risk: ${market.riskLevel}`
      );

      // Save for API endpoint usage
      this.lastStatus = {
        lastRefreshed: new Date().toISOString(),
        sentiment: market.sentiment,
        riskLevel: market.riskLevel,
        summary: market.summary,
        advice: market.advice,
        message: "Market refreshed successfully",
      };
    } catch (err) {
      console.warn("⚠️ Heartbeat error:", err.message);
      this.lastStatus = {
        lastRefreshed: new Date().toISOString(),
        sentiment: "Unknown",
        riskLevel: "Unknown",
        message: `Error during refresh: ${err.message}`,
      };
    }
  }

  // 🔍 Option 2 — helper for exposing refresh status via an API route
  getStatus() {
    return this.lastStatus;
  }
}
