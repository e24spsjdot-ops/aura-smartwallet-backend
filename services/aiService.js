// services/aiService.js
import OpenAI from 'openai';
import { CacheService } from './cacheService.js';

// 🧹 Clean up GPT responses that come wrapped in ```json ... ```
function cleanJSON(text) {
  if (!text) return text;
  return text.replace(/```json|```/g, '').trim();
}

export class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.cache = new CacheService();
    this.cachedMarketContext = null;
  }

  /**
   * 🧭 Get general market context (cached to save tokens)
   */
  async getMarketContext() {
    const cacheKey = 'market:context';
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.cachedMarketContext = cached;
      return cached;
    }

    try {
      // 🧠 Optional: skip GPT call if quota saving is critical
      // return { sentiment: 'Neutral', riskLevel: 'MEDIUM', summary: 'Stable market' };

      const prompt = `Give a very short JSON summary of crypto market sentiment, risk level, and outlook. 
      Example: {"sentiment": "Bullish", "riskLevel": "LOW", "summary": "Market recovering from correction."}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.5,
      });

      const text = response.choices[0]?.message?.content?.trim();
      const parsed = JSON.parse(cleanJSON(text));

      this.cachedMarketContext = parsed;
      await this.cache.set(cacheKey, parsed, 600); // cache for 10 minutes

      return parsed;
    } catch (error) {
      console.error('⚠️ Market context fallback due to error:', error.message);
      const fallback = { sentiment: 'Neutral', riskLevel: 'MEDIUM', summary: 'Stable or uncertain conditions' };
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
        Tokens: ${topTokens.map(t => `${t.symbol}: $${t.valueUSD}`).join(', ')}
        Risk: ${riskScore.level}
        Strategies: ${auraStrategies.map(s => s.name).join(', ')}
        Return a JSON summary with "keyInsights" (array of 3 bullet points).
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.6,
      });

      const text = response.choices[0]?.message?.content?.trim();
      const insights = JSON.parse(cleanJSON(text));

      await this.cache.set(cacheKey, insights, 900); // 15 min cache
      return insights;
    } catch (error) {
      console.error('⚠️ AI analyzePortfolio fallback:', error.message);
      return {
        keyInsights: [
          'Portfolio shows balanced exposure.',
          'Diversify stable and volatile assets for lower risk.',
          'Consider yield strategies for unused capital.'
        ],
      };
    }
  }

  /**
   * ⚡ Predict swap timing (NO API CALLS)
   */
  async predictSwapTiming(fromToken, toToken, amount, marketContext = null) {
    try {
      const context = marketContext || this.cachedMarketContext || {
        sentiment: 'Neutral',
        riskLevel: 'MEDIUM',
      };

      let timing = 'Analyze market conditions';
      let confidence = 60;
      let reasoning = 'Market data unavailable';
      let potentialSavings = 0;
      let risks = ['Volatility unknown'];

      if (context.sentiment === 'Bullish' && context.riskLevel === 'LOW') {
        timing = 'Execute soon (within 1-3 hours)';
        confidence = 85;
        reasoning = 'Bullish market and low risk environment.';
        potentialSavings = 3.5;
        risks = ['Minor short-term volatility'];
      } else if (context.sentiment === 'Bearish') {
        timing = 'Wait 12-24 hours';
        confidence = 70;
        reasoning = 'Bearish sentiment detected.';
        risks = ['Potential price drops'];
      } else if (context.sentiment === 'Neutral') {
        timing = 'Swap within 6 hours';
        confidence = 75;
        reasoning = 'Stable market conditions.';
        potentialSavings = 1.2;
        risks = ['Possible sudden sentiment shifts'];
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
      console.error('⚠️ Fallback in predictSwapTiming:', error.message);
      return {
        fromToken,
        toToken,
        amount,
        timing: 'Analyze market manually',
        confidence: 50,
        reasoning: 'Error in prediction logic',
        potentialSavings: 0,
        risks: ['Unknown market condition'],
        timestamp: new Date().toISOString(),
      };
    }
  }
}
