// controllers/walletController.js
import { AuraService } from '../services/auraService.js';
import { AIService } from '../services/aiService.js';
import { RiskAnalyzer } from '../services/riskAnalyzer.js';
import { CacheService } from '../services/cacheService.js';

export class WalletController {
  constructor() {
    this.auraService = new AuraService();
    this.aiService = new AIService();
    this.riskAnalyzer = new RiskAnalyzer();
    this.cache = new CacheService();
  }

  /**
   * GET /api/wallet/:address/aura-strategies
   */
  getAuraStrategies = async (req, res, next) => {
    try {
      const { address } = req.params;
      const strategies = await this.auraService.getInvestmentStrategies(address);

      res.json({
        address,
        strategies,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Basic wallet overview
   */
  getWalletOverview = async (req, res, next) => {
    try {
      const { address } = req.params;

      const cached = await this.cache.get(`wallet:${address}`);
      if (cached) return res.json({ ...cached, cached: true });

      const walletData = await this.auraService.getWalletData(address);
      const tokens = await this.auraService.getTokenBalances(address);

      const totalValue = tokens.reduce((sum, token) => sum + token.valueUSD, 0);
      const tokenCount = tokens.length;

      const overview = {
        address,
        totalValue,
        tokenCount,
        tokens: tokens.slice(0, 10),
        lastUpdated: new Date().toISOString()
      };

      await this.cache.set(`wallet:${address}`, overview, 300);
      res.json(overview);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Token holdings
   */
  getTokenHoldings = async (req, res, next) => {
    try {
      const { address } = req.params;
      const tokens = await this.auraService.getTokenBalances(address);

      const enrichedTokens = await Promise.all(
        tokens.map(async (token) => {
          const priceData = await this.auraService.getTokenPrice(token.symbol);
          return {
            ...token,
            price: priceData.current,
            change24h: priceData.change24h,
            marketCap: priceData.marketCap
          };
        })
      );

      res.json({
        address,
        tokens: enrichedTokens,
        totalTokens: enrichedTokens.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Transaction history
   */
  getTransactionHistory = async (req, res, next) => {
    try {
      const { address } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const transactions = await this.auraService.getTransactions(
        address,
        parseInt(limit),
        parseInt(offset)
      );

      const analyzedTxs = transactions.map(tx => ({
        ...tx,
        riskLevel: this.riskAnalyzer.assessTransactionRisk(tx)
      }));

      res.json({
        address,
        transactions: analyzedTxs,
        total: analyzedTxs.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Comprehensive AI-powered wallet analysis
   */
  analyzeWallet = async (req, res, next) => {
    try {
      const { address } = req.params;
      console.log('🚀 Starting analysis for:', address);

      const auraData = await this.auraService.getPortfolioWithStrategies(address);
      const tokens = await this.auraService.getTokenBalances(address);
      const totalValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
      const auraStrategies = await this.auraService.getInvestmentStrategies(address);
      const yourRiskScore = await this.riskAnalyzer.calculatePortfolioRisk({ tokens });
      const marketContext = await this.aiService.getMarketContext();
      const yourAIInsights = await this.aiService.analyzePortfolio({
        tokens,
        auraStrategies,
        riskScore: yourRiskScore
      });

      const swapPredictions = await this.aiService.predictSwapTiming(
        tokens[0]?.symbol,
        'USDC',
        tokens[0]?.balance
      );

      const finalRecommendation = this.combineInsights(
        auraStrategies,
        yourRiskScore,
        yourAIInsights
      );

      const analysis = {
        address,
        auraStrategies,
        yourRiskScore,
        yourAIInsights,
        swapPredictions,
        recommendation: finalRecommendation,
        timestamp: new Date().toISOString()
      };

      res.json(analysis);
    } catch (error) {
      console.error('❌ Error in wallet analysis:', error);
      next(error);
    }
  };

  /**
   * Simple risk score
   */
  getRiskScore = async (req, res, next) => {
    try {
      const { address } = req.params;
      const tokens = await this.auraService.getTokenBalances(address);
      const yourRiskScore = await this.riskAnalyzer.calculatePortfolioRisk({ tokens });

      res.json({
        address,
        yourRiskScore,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 🧠 Combine insights (AURA + Risk + AI)
   */
  combineInsights(auraStrategies, riskScore, aiInsights) {
    const combined = [];

    if (auraStrategies?.length) {
      combined.push(...auraStrategies.map(s => ({
        source: 'AURA',
        name: s.name,
        risk: s.risk || 'medium',
        action: s.actions?.[0]?.description || 'See strategy details'
      })));
    }

    if (riskScore?.level) {
      combined.push({
        source: 'RiskAnalyzer',
        name: 'Portfolio Risk Assessment',
        risk: riskScore.level,
        action: riskScore.recommendations?.[0] || 'Rebalance suggested'
      });
    }

    if (aiInsights?.keyInsights?.length) {
      combined.push(...aiInsights.keyInsights.map(k => ({
        source: 'AI Layer',
        name: 'Insight',
        risk: 'contextual',
        action: k
      })));
    }

    return combined;
  }

  /**
   * Generate final advice (used for UI)
   */
  generateFinalAdvice(data) {
    const { auraStrategies, riskScore, marketContext, yourAIInsights, recommendations } = data;
    let advice = {
      shouldFollowAura: true,
      primaryAction: '',
      reasoning: '',
      urgency: 'medium'
    };

    if (riskScore.level === 'HIGH' || riskScore.level === 'CRITICAL') {
      advice.shouldFollowAura = false;
      advice.primaryAction = 'Rebalance portfolio before yield strategies';
      advice.reasoning = 'Portfolio risk is elevated.';
      advice.urgency = 'high';
    } else if (marketContext.sentiment === 'Bearish') {
      advice.shouldFollowAura = false;
      advice.primaryAction = 'Focus on stable yields only';
      advice.reasoning = 'Bearish sentiment detected.';
      advice.urgency = 'medium';
    } else if (auraStrategies?.length) {
      advice.primaryAction = `Execute AURA's "${auraStrategies[0].name}"`;
      advice.reasoning = 'Portfolio well-positioned.';
    } else {
      advice.primaryAction = 'Monitor portfolio';
      advice.reasoning = 'No actions required.';
      advice.urgency = 'low';
    }

    return advice;
  }
}
