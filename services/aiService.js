// services/aiService.js - Optimized with caching
import OpenAI from 'openai';

export class AIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = 'gpt-3.5-turbo'; // Cheaper model
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 mins
  }

  async safeCall(prompt, maxTokens = 300) {
    if (!process.env.OPENAI_API_KEY) {
      return "AI offline - using fallback";
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI error:', error.message);
      return "AI unavailable";
    }
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, time: Date.now() });
  }

  async analyzePortfolio(data) {
    const cached = this.getCached('portfolio');
    if (cached) return cached;

    const result = {
      summary: 'Portfolio analyzed',
      keyInsights: ['Risk evaluated', 'AURA strategies reviewed'],
      auraEvaluation: 'Strategies appropriate for portfolio',
      personalizedPlan: ['Monitor holdings', 'Review recommendations'],
      warnings: [],
      confidence: 75
    };

    this.setCache('portfolio', result);
    return result;
  }

  async getMarketContext() {
    const cached = this.getCached('market');
    if (cached) return cached;

    const result = {
      sentiment: 'Neutral',
      keyFactors: ['Standard volatility'],
      advice: 'Monitor conditions',
      riskLevel: 'MEDIUM'
    };

    this.setCache('market', result);
    return result;
  }

  async predictSwapTiming(from, to, amount, context) {
    return {
      timing: 'Monitor gas fees',
      confidence: 60,
      reasoning: 'Check market volatility',
      potentialSavings: 0,
      risks: ['Price movement']
    };
  }

  async assessPlatformSafety(platform, op) {
    return {
      platform,
      operation: op,
      safetyRating: 'MODERATE',
      concerns: ['Research platform'],
      recommendation: 'Standard precautions'
    };
  }

  async calculateTaxImpact(tx, location) {
    return {
      isTaxable: true,
      category: 'Capital gains',
      estimatedImpact: 'Consult professional',
      disclaimer: 'Educational only'
    };
  }

  async generateRecommendations(data) {
    return [{
      action: 'Review portfolio',
      reasoning: 'Regular monitoring recommended',
      priority: 'Medium'
    }];
  }

  async assessTransactionRisk(tx) {
    return {
      level: 'MEDIUM',
      explanation: 'Standard risk',
      shouldProceed: 'Caution'
    };
  }
}
