// services/aiService.js
import OpenAI from "openai";
import { CacheService } from "./cacheService.js";
import fetch from "node-fetch"; // ensure node-fetch is installed (npm install node-fetch)

// 🧹 Clean up GPT responses that come wrapped in ```json ... ```
function cleanJSON(text) {
  if (!text) return text;
  return text.replace(/```json|```/g, "").trim();
}

export class AIService {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.cache = new CacheService();
    this.cachedMarketContext = null;
  }

  /**
   * 🌍 Get live market context with CoinGecko + GPT summary
   */
  async getMarketContext() {
    const cacheKey = "market:context";
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.cachedMarketContext = cached;
      return cached;
    }

    try {
      // 🔹 Step 1: Get live data from CoinGecko
      const coingeckoURL =
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&precision=2";
      const response = await fetch(coingeckoURL);
      const prices = await response.json();

      const btc = prices.bitcoin || {};
      const eth = prices.ethereum || {};

      // 🔹 Step 2: Create a concise prompt for GPT
      const prompt = `
        Analyze the following crypto data and return a JSON summary:
        BTC: $${btc.usd}, 24h change ${btc.usd_24h_change?.toFixed(2)}%
        ETH: $${eth.usd}, 24h change ${eth.usd_24h_change?.toFixed(2)}%
        Market Cap (BTC): $${btc.usd_market_cap}, Volume (BTC): $${btc.usd_24h_vol}

        Respond as JSON only, example:
        {
          "sentiment": "Bullish",
          "riskLevel": "LOW",
          "summary": "Bitcoin and Ethereum showing positive momentum with healthy volume.",
          "advice": "Consider moderate buying or strategic re-entry.",
          "liveData": {
            "btcPrice": 68000,
            "ethPrice": 2450,
            "btcChange24h": 1.2,
            "ethChange24h": 0.8,
            "marketCapUSD": 1560000000000,
            "volumeUSD": 58000000000,
            "btcDominance": 54.3,
            "ethDominance": 18.2
          }
        }
      `;

      // 🔹 Step 3: Generate summary using GPT
      const gptResponse = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 300,
      });

      const text = gptResponse.choices[0]?.message?.content?.trim();
      const parsed = JSON.parse(cleanJSON(text));

      // 🔹 Step 4: Merge live data (guaranteed)
      parsed.liveData = {
        btcPrice: btc.usd || 0,
        ethPrice: eth.usd || 0,
        btcChange24h: btc.usd_24h_change || 0,
        ethChange24h: eth.usd_24h_change || 0,
        marketCapUSD: btc.usd_market_cap + eth.usd_market_cap || 0,
        volumeUSD: btc.usd_24h_vol + eth.usd_24h_vol || 0,
        btcDominance: 54.0, // optional static fallback
        ethDominance: 18.0, // optional static fallback
      };

      parsed.timestamp = new Date().toISOString();

      // 🔹 Step 5: Cache for 10 minutes
      await this.cache.set(cacheKey, parsed, 600);
      this.cachedMarketContext = parsed;
      return parsed;
    } catch (error) {
      console.error("⚠️ getMarketContext fallback due to error:", error.message);
      const fallback = {
        sentiment: "Neutral",
        riskLevel: "MEDIUM",
        summary: "Stable or uncertain conditions.",
        advice: "Monitor market closely before making major moves.",
        liveData: {
          btcPrice: 0,
          ethPrice: 0,
          btcChange24h: 0,
          ethChange24h: 0,
          marketCapUSD: 0,
          volumeUSD: 0,
          btcDominance: 0,
          ethDominance: 0,
        },
        timestamp: new Date().toISOString(),
      };
      this.cachedMarketContext = fallback;
      return fallback;
    }
  }

  /**
   * 📊 Analyze portfolio using AI (cached or simplified)
   */
  async analyzePortfolio({ tokens, auraStrategies, riskScore }) {
    const cacheKey = `ai:portfolio:${riskScore?.level}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const topTokens = tokens.slice(0, 5);
      const prompt = `
        Analyze this portfolio briefly:
        Tokens: ${topTokens.map((t) => `${t.symbol}: $${t.valueUSD}`).join(", ")}
        Risk: ${riskScore.level}
        Strategies: ${auraStrategies.map((s) => s.name).join(", ")}
        Return a JSON summary with "keyInsights" (array of 3 bullet points).
      `;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.6,
      });

      const text = response.choices[0]?.message?.content?.trim();
      const insights = JSON.parse(cleanJSON(text));

      await this.cache.set(cacheKey, insights, 900);
      return insights;
    } catch (error) {
      console.error("⚠️ AI analyzePortfolio fallback:", error.message);
      return {
        keyInsights: [
          "Portfolio shows balanced exposure.",
          "Diversify stable and volatile assets for lower risk.",
          "Consider yield strategies for unused capital.",
        ],
      };
    }
  }

  /**
   * ⚡ Predict swap timing (NO API CALLS)
   */
  async predictSwapTiming(fromToken, toToken, amount, marketContext = null) {
    try {
      const context =
        marketContext || this.cachedMarketContext || {
          sentiment: "Neutral",
          riskLevel: "MEDIUM",
        };

      let timing = "Analyze market conditions";
      let confidence = 60;
      let reasoning = "Market data unavailable";
      let potentialSavings = 0;
      let risks = ["Volatility unknown"];

      if (context.sentiment === "Bullish" && context.riskLevel === "LOW") {
        timing = "Execute soon (within 1-3 hours)";
        confidence = 85;
        reasoning = "Bullish market and low risk environment.";
        potentialSavings = 3.5;
        risks = ["Minor short-term volatility"];
      } else if (context.sentiment === "Bearish") {
        timing = "Wait 12-24 hours";
        confidence = 70;
        reasoning = "Bearish sentiment detected.";
        risks = ["Potential price drops"];
      } else if (context.sentiment === "Neutral") {
        timing = "Swap within 6 hours";
        confidence = 75;
        reasoning = "Stable market conditions.";
        potentialSavings = 1.2;
        risks = ["Possible sudden sentiment shifts"];
      }

      return {
        fromToken,
        toToken,
        amount,
        timing,
        confidence,
        reasoning,
        potentialSavings,
        risks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("⚠️ Fallback in predictSwapTiming:", error.message);
      return {
        fromToken,
        toToken,
        amount,
        timing: "Analyze market manually",
        confidence: 50,
        reasoning: "Error in prediction logic",
        potentialSavings: 0,
        risks: ["Unknown market condition"],
        timestamp: new Date().toISOString(),
      };
    }
  }
}
