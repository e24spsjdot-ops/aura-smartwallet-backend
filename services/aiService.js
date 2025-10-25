// services/aiService.js
import OpenAI from "openai";
import { CacheService } from "./cacheService.js";
import fetch from "node-fetch"; // npm install node-fetch
import axios from "axios";

// 🧹 Clean up GPT responses wrapped in ```json ... ```
function cleanJSON(text) {
  if (!text) return text;
  return text.replace(/```json|```/g, "").trim();
}

export class AIService {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.cache = new CacheService();
    this.cachedMarketContext = null;

    // ✅ Aura Adex API base URL (main source)
    this.auraAPI =
      process.env.AURA_API_URL || "https://aura.adex.network/api";
  }

  /**
   * 🌍 Get live market context — combines AURA API + CoinGecko + GPT
   */
  async getMarketContext() {
    const cacheKey = "market:context";
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.cachedMarketContext = cached;
      return cached;
    }

    try {
      let auraData = null;
      let cgData = null;

      // 1️⃣ Try fetching AURA API market data
      try {
        const auraRes = await axios.get(`${this.auraAPI}/market/overview`);
        auraData = auraRes.data;
      } catch (e) {
        console.warn("⚠️ AURA API market data unavailable, falling back to CoinGecko");
      }

      // 2️⃣ Fallback or supplement with CoinGecko live data
      const cgRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&precision=2"
      );
      const prices = await cgRes.json();

      const btc = prices.bitcoin || {};
      const eth = prices.ethereum || {};

      // 3️⃣ Merge AURA + CoinGecko into a unified snapshot (with safe fallbacks)
      const combinedMarket = {
        totalMarketCap:
          auraData?.totalMarketCap ||
          (btc.usd_market_cap ?? 0) + (eth.usd_market_cap ?? 0) ||
          0,
        btcDominance: auraData?.btcDominance || 54.0,
        ethDominance: auraData?.ethDominance || 18.0,
        fearGreedIndex: auraData?.fearGreedIndex || 50,
        trending: auraData?.trending || ["BTC", "ETH"],
        btc: {
          price: btc.usd ?? 0,
          change24h: btc.usd_24h_change ?? 0,
          marketCap: btc.usd_market_cap ?? 0,
          volume24h: btc.usd_24h_vol ?? 0,
        },
        eth: {
          price: eth.usd ?? 0,
          change24h: eth.usd_24h_change ?? 0,
          marketCap: eth.usd_market_cap ?? 0,
          volume24h: eth.usd_24h_vol ?? 0,
        },
      };
      
      // 🩹 If totalMarketCap is still 0, synthesize a value from prices
      if (combinedMarket.totalMarketCap === 0 && combinedMarket.btc.price > 0) {
        combinedMarket.totalMarketCap =
          (combinedMarket.btc.price * 19000000) + // BTC supply estimate
          (combinedMarket.eth.price * 120000000); // ETH supply estimate
      }


      // 4️⃣ Ask GPT for summarized sentiment
      const prompt = `
        Given this market data:
        BTC: $${combinedMarket.btc.price} (${combinedMarket.btc.change24h.toFixed(2)}%)
        ETH: $${combinedMarket.eth.price} (${combinedMarket.eth.change24h.toFixed(2)}%)
        Market Cap: $${combinedMarket.totalMarketCap.toFixed(0)}
        BTC Dominance: ${combinedMarket.btcDominance}%
        Fear & Greed Index: ${combinedMarket.fearGreedIndex}

        Provide a short JSON summary like:
        {
          "sentiment": "Bullish" | "Bearish" | "Neutral",
          "riskLevel": "LOW" | "MEDIUM" | "HIGH",
          "summary": "one-sentence summary",
          "advice": "1-line market advice"
        }
      `;

      const gptRes = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 250,
      });

      const text = gptRes.choices[0]?.message?.content?.trim();
      const parsed = JSON.parse(cleanJSON(text));

      // 5️⃣ Merge live data
      parsed.liveData = {
        btcPrice: combinedMarket.btc.price,
        ethPrice: combinedMarket.eth.price,
        btcChange24h: combinedMarket.btc.change24h,
        ethChange24h: combinedMarket.eth.change24h,
        marketCapUSD: combinedMarket.totalMarketCap,
        volumeUSD:
          combinedMarket.btc.volume24h + combinedMarket.eth.volume24h,
        btcDominance: combinedMarket.btcDominance,
        ethDominance: combinedMarket.ethDominance,
        fearGreedIndex: combinedMarket.fearGreedIndex,
        trending: combinedMarket.trending,
      };

      parsed.timestamp = new Date().toISOString();

      // 6️⃣ Cache for 10 min
      await this.cache.set(cacheKey, parsed, 600);
      this.cachedMarketContext = parsed;
      return parsed;
    } catch (error) {
      console.error("⚠️ getMarketContext fallback:", error.message);
      const fallback = {
        sentiment: "Neutral",
        riskLevel: "MEDIUM",
        summary: "Stable or uncertain market.",
        advice: "Monitor before making moves.",
        liveData: {
          btcPrice: 0,
          ethPrice: 0,
          btcChange24h: 0,
          ethChange24h: 0,
          marketCapUSD: 0,
          volumeUSD: 0,
          btcDominance: 0,
          ethDominance: 0,
          fearGreedIndex: 0,
          trending: [],
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
        timing = "Execute soon (within 1–3 hours)";
        confidence = 85;
        reasoning = "Bullish market and low risk environment.";
        potentialSavings = 3.5;
        risks = ["Minor short-term volatility"];
      } else if (context.sentiment === "Bearish") {
        timing = "Wait 12–24 hours";
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
