// services/aiService.js
import OpenAI from "openai";
import { CacheService } from "./cacheService.js";
import fetch from "node-fetch";
import axios from "axios";

// 🧹 Clean GPT JSON response
function cleanJSON(text) {
  if (!text) return text;
  return text.replace(/```json|```/g, "").trim();
}

export class AIService {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.cache = new CacheService();
    this.cachedMarketContext = null;

    this.auraAPI = process.env.AURA_API_URL || "https://aura.adex.network/api";
  }

  async getMarketContext() {
    const cacheKey = "market:context";
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    let marketSource = "UNKNOWN";
    let combinedMarket = null;

    try {
      // 1️⃣ Try AURA API
      try {
        const auraRes = await axios.get(`${this.auraAPI}/market/overview`);
        if (auraRes.data && auraRes.data.totalMarketCap) {
          combinedMarket = auraRes.data;
          marketSource = "AURA";
        }
      } catch {
        console.warn("⚠️ AURA API unavailable, trying CoinGecko...");
      }

      // 2️⃣ CoinGecko fallback
      if (!combinedMarket) {
        try {
          const cgRes = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,aura-network&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&precision=2"
          );
          const cg = await cgRes.json();
          if (cg.bitcoin && cg.ethereum) {
            combinedMarket = {
              totalMarketCap:
                (cg.bitcoin.usd_market_cap || 0) +
                (cg.ethereum.usd_market_cap || 0),
              btc: {
                price: cg.bitcoin.usd,
                change24h: cg.bitcoin.usd_24h_change,
              },
              eth: {
                price: cg.ethereum.usd,
                change24h: cg.ethereum.usd_24h_change,
              },
              usdt: {
                price: cg.tether?.usd || 1.0,
                change24h: cg.tether?.usd_24h_change || 0,
              },
              aura: {
                price: cg["aura-network"]?.usd || 0,
                change24h: cg["aura-network"]?.usd_24h_change || 0,
              },
              btcDominance: 54,
              ethDominance: 18,
              fearGreedIndex: 50,
              trending: ["BTC", "ETH", "USDT", "AURA"],
            };
            marketSource = "COINGECKO";
          }
        } catch {
          console.warn("⚠️ CoinGecko rate-limited, switching to CoinPaprika...");
        }
      }

      // 3️⃣ CoinPaprika fallback
      if (!combinedMarket) {
        try {
          const res = await fetch("https://api.coinpaprika.com/v1/tickers");
          const list = await res.json();
          const btc = list.find((x) => x.id === "btc-bitcoin");
          const eth = list.find((x) => x.id === "eth-ethereum");
          const usdt = list.find((x) => x.symbol === "USDT");
          combinedMarket = {
            totalMarketCap: (btc?.quotes?.USD?.market_cap || 0) + (eth?.quotes?.USD?.market_cap || 0),
            btc: { price: btc?.quotes?.USD?.price || 0, change24h: btc?.quotes?.USD?.percent_change_24h || 0 },
            eth: { price: eth?.quotes?.USD?.price || 0, change24h: eth?.quotes?.USD?.percent_change_24h || 0 },
            usdt: { price: usdt?.quotes?.USD?.price || 1.0, change24h: usdt?.quotes?.USD?.percent_change_24h || 0 },
            btcDominance: 54,
            ethDominance: 18,
            fearGreedIndex: 50,
            trending: ["BTC", "ETH", "USDT"],
          };
          marketSource = "COINPAPRIKA";
        } catch {
          console.warn("⚠️ CoinPaprika unavailable, using CryptoCompare...");
        }
      }

      // 4️⃣ CryptoCompare fallback
      if (!combinedMarket) {
        try {
          const res = await fetch(
            "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,USDT&tsyms=USD"
          );
          const data = await res.json();
          combinedMarket = {
            totalMarketCap: 0,
            btc: { price: data.BTC?.USD || 0, change24h: 0 },
            eth: { price: data.ETH?.USD || 0, change24h: 0 },
            usdt: { price: data.USDT?.USD || 1, change24h: 0 },
            btcDominance: 54,
            ethDominance: 18,
            fearGreedIndex: 50,
            trending: ["BTC", "ETH", "USDT"],
          };
          marketSource = "CRYPTOCOMPARE";
        } catch {
          console.warn("⚠️ CryptoCompare also failed, returning last cached data...");
        }
      }

      // 🧩 If no data — use last cached
      if (!combinedMarket) {
        const fallback = this.cachedMarketContext || {
          sentiment: "Neutral",
          summary: "Unable to retrieve live market data.",
          liveData: { btcPrice: 0, ethPrice: 0, usdtPrice: 0, auraPrice: 0 },
        };
        console.warn("⚠️ Using cached market data as final fallback.");
        return fallback;
      }

      // 🧠 GPT Summary
      const prompt = `
      Given this market data:
      BTC: $${combinedMarket.btc.price} (${combinedMarket.btc.change24h.toFixed(2)}%)
      ETH: $${combinedMarket.eth.price} (${combinedMarket.eth.change24h.toFixed(2)}%)
      USDT: $${combinedMarket.usdt.price} (${combinedMarket.usdt.change24h.toFixed(2)}%)
      Market Source: ${marketSource}
      Provide JSON:
      {
        "sentiment": "Bullish" | "Bearish" | "Neutral",
        "riskLevel": "LOW" | "MEDIUM" | "HIGH",
        "summary": "short summary",
        "advice": "short advice"
      }`;

      const gptRes = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 200,
      });

      const text = gptRes.choices[0]?.message?.content?.trim();
      const parsed = JSON.parse(cleanJSON(text));

      parsed.liveData = {
        btcPrice: combinedMarket.btc.price,
        ethPrice: combinedMarket.eth.price,
        usdtPrice: combinedMarket.usdt.price,
        auraPrice: combinedMarket.aura?.price || 0,
        btcChange24h: combinedMarket.btc.change24h,
        ethChange24h: combinedMarket.eth.change24h,
        usdtChange24h: combinedMarket.usdt.change24h,
        marketCapUSD: combinedMarket.totalMarketCap,
        btcDominance: combinedMarket.btcDominance,
        ethDominance: combinedMarket.ethDominance,
        fearGreedIndex: combinedMarket.fearGreedIndex,
        trending: combinedMarket.trending,
        source: marketSource,
      };

      parsed.timestamp = new Date().toISOString();

      await this.cache.set(cacheKey, parsed, 600);
      this.cachedMarketContext = parsed;

      console.log(`✅ Market context refreshed via ${marketSource}`);
      return parsed;
    } catch (err) {
      console.warn("⚠️ getMarketContext failed:", err.message);
      return this.cachedMarketContext || {
        sentiment: "Neutral",
        riskLevel: "MEDIUM",
        summary: "Fallback to cached or default context.",
        advice: "Wait for market data recovery.",
      };
    }
  }

  // 🔍 Portfolio analysis (unchanged)
  async analyzePortfolio({ tokens, auraStrategies, riskScore }) { /* ...same as your version... */ }

  // ⚡ Swap timing (unchanged)
  async predictSwapTiming(fromToken, toToken, amount, marketContext = null) { /* ...same as your version... */ }
}
