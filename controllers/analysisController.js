// controllers/analysisController.js - AI analysis business logic
import { AIService } from '../services/aiService.js';
import { AuraService } from '../services/auraService.js';
import { RiskAnalyzer } from '../services/riskAnalyzer.js';

export class AnalysisController {
  constructor() {
    this.aiService = new AIService();
    this.auraService = new AuraService();
    this.riskAnalyzer = new RiskAnalyzer();
  }

  /**
   * 🎯 ENHANCED: Predict optimal swap timing with market context
   */
  predictSwapTiming = async (req, res, next) => {
    try {
      const { fromToken, toToken, amount } = req.body;

      // Get market context first
      const marketContext = await this.aiService.getMarketContext();

      // Predict timing with context
      const prediction = await this.aiService.predictSwapTiming(
        fromToken,
        toToken,
        amount,
        marketContext
      );

      res.json({
        fromToken,
        toToken,
        amount,
        prediction,
        marketContext,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 🎯 ENHANCED: Assess transaction risk with AI warnings
   */
  assessTransactionRisk = async (req, res, next) => {
    try {
      const transaction = req.body;

      // Validate transaction structure
      if (!transaction.to || !transaction.value) {
        return res.status(400).json({
          error: 'Invalid transaction: missing required fields (to, value)'
        });
      }

      // Get risk assessment from analyzer
      const riskAssessment = this.riskAnalyzer.assessTransactionRisk(transaction);
      
      // Get AI analysis for high-risk transactions
      let aiAnalysis = null;
      if (riskAssessment.level === 'HIGH' || riskAssessment.level === 'CRITICAL') {
        aiAnalysis = await this.aiService.assessTransactionRisk(transaction);
      }

      // Get platform safety if contract address provided
      let platformSafety = null;
      if (transaction.contractAddress) {
        platformSafety = await this.aiService.assessPlatformSafety(
          transaction.contractName || 'Unknown Contract',
          transaction.operation || 'transaction'
        );
      }

      res.json({
        transaction: {
          hash: transaction.hash || 'pending',
          to: transaction.to,
          value: transaction.value
        },
        risk: riskAssessment,
        aiAnalysis,
        platformSafety,
        recommendation: this.getTransactionRecommendation(riskAssessment),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
 * 🎯 ENHANCED: Get market insights with hybrid AURA + CoinGecko + GPT context
 */
  getMarketInsights = async (req, res, next) => {
    try {
      // 🧠 Step 1: Get AI + Live market context (AURA + CoinGecko)
      const marketContext = await this.aiService.getMarketContext();
  
      // 💹 Step 2: Get AURA market data (as available)
      let marketData = {};
      try {
        marketData = await this.auraService.getMarketConditions();
      } catch (e) {
        console.warn("⚠️ AURA API market data unavailable, fallback using AI liveData");
        marketData = {
          totalMarketCap: marketContext.liveData.marketCapUSD,
          btcDominance: marketContext.liveData.btcDominance,
          fearGreedIndex: marketContext.liveData.fearGreedIndex || 50,
          trending: marketContext.liveData.trending || ["BTC", "ETH"],
        };
      }
  
      // 🔍 Step 3: Combine all insights
      const combinedInsight = this.interpretMarketSentiment(marketContext);
  
      const insights = {
        aiContext: marketContext,
        marketData,
        combinedInsight,
        recommendations: this.getMarketRecommendations(marketContext),
        timestamp: new Date().toISOString(),
      };
  
      res.json(insights);
    } catch (error) {
      console.error("❌ getMarketInsights error:", error.message);
      next(error);
    }
  };

  /**
   * 🎯 ENHANCED: Get portfolio health with all enhancements
   */
  getPortfolioHealth = async (req, res, next) => {
    try {
      const { address } = req.params;

      console.log('🏥 Calculating portfolio health for:', address);

      // Get AURA data
      const tokens = await this.auraService.getTokenBalances(address);
      const auraStrategies = await this.auraService.getInvestmentStrategies(address);
      
      // Calculate risk score
      const riskScore = await this.riskAnalyzer.calculatePortfolioRisk({
        tokens,
        transactions: []
      });

      // Get market context
      const marketContext = await this.aiService.getMarketContext();

      const totalValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
      
      // Calculate health score (inverse of risk)
      const healthScore = 100 - riskScore.score;

      const health = {
        address,
        healthScore: Math.round(healthScore),
        healthLevel: this.getHealthLevel(healthScore),
        riskScore,
        metrics: {
          totalValue,
          tokenCount: tokens.length,
          diversificationScore: this.calculateDiversificationScore(tokens),
          stabilityScore: this.calculateStabilityScore(tokens),
          marketAlignment: this.calculateMarketAlignment(marketContext)
        },
        auraStrategiesAvailable: auraStrategies?.length || 0,
        actionItems: this.getHealthActionItems(healthScore, riskScore, marketContext),
        marketContext: {
          sentiment: marketContext.sentiment,
          advice: marketContext.advice
        },
        timestamp: new Date().toISOString()
      };

      res.json(health);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 🎯 NEW: Calculate tax impact for a potential transaction
   */
  calculateTaxImpact = async (req, res, next) => {
    try {
      const transaction = req.body;
      const userLocation = req.body.location || 'US';

      const taxImpact = await this.aiService.calculateTaxImpact(transaction, userLocation);

      res.json({
        transaction,
        taxImpact,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 🎯 NEW: Assess platform safety
   */
  assessPlatformSafety = async (req, res, next) => {
    try {
      const { platform, operation } = req.body;

      if (!platform) {
        return res.status(400).json({
          error: 'Platform name is required'
        });
      }

      const safety = await this.aiService.assessPlatformSafety(
        platform,
        operation || 'general use'
      );

      res.json({
        platform,
        operation,
        safety,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== HELPER METHODS ====================

  getTransactionRecommendation(riskAssessment) {
    switch (riskAssessment.level) {
      case 'CRITICAL':
        return {
          action: 'REJECT',
          message: '🚫 Do not proceed with this transaction',
          color: 'red',
          emoji: '⛔'
        };
      case 'HIGH':
        return {
          action: 'REVIEW',
          message: '⚠️ Carefully review before proceeding',
          color: 'orange',
          emoji: '⚠️'
        };
      case 'MEDIUM':
        return {
          action: 'CAUTION',
          message: '⚡ Proceed with normal caution',
          color: 'yellow',
          emoji: '⚡'
        };
      default:
        return {
          action: 'PROCEED',
          message: '✅ Transaction appears safe',
          color: 'green',
          emoji: '✅'
        };
    }
  }

  interpretMarketSentiment(marketContext) {
    const sentiment = marketContext.sentiment;
    
    const interpretations = {
      'Bullish': {
        status: 'Positive Market Conditions',
        advice: 'Good time for strategic investments',
        riskLevel: 'MEDIUM',
        emoji: '📈'
      },
      'Bearish': {
        status: 'Cautious Market Conditions',
        advice: 'Focus on defensive strategies',
        riskLevel: 'HIGH',
        emoji: '📉'
      },
      'Neutral': {
        status: 'Balanced Market Conditions',
        advice: 'Standard investment strategies apply',
        riskLevel: 'MEDIUM',
        emoji: '➡️'
      }
    };

    return interpretations[sentiment] || interpretations['Neutral'];
  }

  getMarketRecommendations(marketContext) {
    const recommendations = [];
    
    if (marketContext.sentiment === 'Bearish') {
      recommendations.push({
        type: 'DEFENSIVE',
        reason: 'Market sentiment is bearish',
        action: 'Increase stablecoin allocation',
        urgency: 'High'
      });
    } else if (marketContext.sentiment === 'Bullish') {
      recommendations.push({
        type: 'OPPORTUNISTIC',
        reason: 'Market sentiment is bullish',
        action: 'Consider strategic positions in quality assets',
        urgency: 'Medium'
      });
    }

    if (marketContext.riskLevel === 'HIGH') {
      recommendations.push({
        type: 'RISK_MANAGEMENT',
        reason: 'High market risk detected',
        action: 'Review and potentially reduce position sizes',
        urgency: 'High'
      });
    }

    return recommendations;
  }

  getHealthLevel(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Critical';
  }

  calculateDiversificationScore(tokens) {
    const count = tokens.length;
    if (count >= 10) return 100;
    if (count >= 7) return 85;
    if (count >= 5) return 70;
    if (count >= 3) return 50;
    return 25;
  }

  calculateStabilityScore(tokens) {
    const totalValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
    if (totalValue === 0) return 0;
    
    let stableValue = 0;

    tokens.forEach(token => {
      if (this.isStableAsset(token.symbol)) {
        stableValue += token.valueUSD;
      }
    });

    const stablePercentage = (stableValue / totalValue) * 100;
    return Math.min(Math.round(stablePercentage * 2), 100);
  }

  calculateMarketAlignment(marketContext) {
    // Score based on how well-positioned portfolio is for current market
    let score = 50; // Base score
    
    if (marketContext.sentiment === 'Bullish') score += 20;
    if (marketContext.sentiment === 'Bearish') score -= 10;
    if (marketContext.riskLevel === 'LOW') score += 15;
    if (marketContext.riskLevel === 'HIGH') score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  isStableAsset(symbol) {
    const stables = ['USDC', 'USDT', 'DAI', 'BTC', 'ETH'];
    return stables.includes(symbol.toUpperCase());
  }

  getHealthActionItems(healthScore, riskScore, marketContext) {
    const items = [];

    // Critical health issues
    if (healthScore < 40) {
      items.push({
        priority: 'URGENT',
        action: 'Immediate portfolio rebalancing required',
        reason: 'Portfolio health is critical',
        emoji: '🚨'
      });
    }

    // Diversification issues
    if (riskScore.factors.diversification.tokenCount < 3) {
      items.push({
        priority: 'HIGH',
        action: 'Add 2-3 quality tokens to improve diversification',
        reason: 'Limited diversification detected',
        emoji: '📊'
      });
    }

    // Volatility issues
    if (riskScore.factors.volatility.breakdown.stablecoins < 10) {
      items.push({
        priority: 'MEDIUM',
        action: 'Increase stablecoin allocation to 10-20%',
        reason: 'Low stable asset buffer',
        emoji: '🛡️'
      });
    }

    // Market-based recommendations
    if (marketContext.sentiment === 'Bearish' && riskScore.level !== 'LOW') {
      items.push({
        priority: 'HIGH',
        action: 'Consider defensive positioning',
        reason: 'Bearish market + elevated portfolio risk',
        emoji: '⚠️'
      });
    }

    // All good
    if (items.length === 0) {
      items.push({
        priority: 'LOW',
        action: 'Portfolio is healthy - maintain current strategy',
        reason: 'All metrics within healthy ranges',
        emoji: '✅'
      });
    }

    return items;
  }
}
