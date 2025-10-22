// services/riskAnalyzer.js - Portfolio and transaction risk analysis
export class RiskAnalyzer {
  /**
   * Calculate comprehensive portfolio risk score
   */
  async calculatePortfolioRisk(data) {
    const { tokens, transactions, walletAge } = data;

    let riskScore = 0;
    const factors = {};

    // 1. Diversification Risk (0-25 points)
    const diversificationRisk = this.calculateDiversificationRisk(tokens);
    riskScore += diversificationRisk.score;
    factors.diversification = diversificationRisk;

    // 2. Volatility Risk (0-30 points)
    const volatilityRisk = this.calculateVolatilityRisk(tokens);
    riskScore += volatilityRisk.score;
    factors.volatility = volatilityRisk;

    // 3. Concentration Risk (0-25 points)
    const concentrationRisk = this.calculateConcentrationRisk(tokens);
    riskScore += concentrationRisk.score;
    factors.concentration = concentrationRisk;

    // 4. Liquidity Risk (0-20 points)
    const liquidityRisk = this.calculateLiquidityRisk(tokens);
    riskScore += liquidityRisk.score;
    factors.liquidity = liquidityRisk;

    // Determine risk level
    const level = this.getRiskLevel(riskScore);

    return {
      score: Math.round(riskScore),
      level,
      factors,
      recommendations: this.getRiskRecommendations(level, factors),
      lastCalculated: new Date().toISOString()
    };
  }

  /**
   * Assess individual transaction risk
   */
  assessTransactionRisk(transaction) {
    let riskScore = 0;
    const warnings = [];

    // Check transaction value
    if (transaction.value > 10000) {
      riskScore += 15;
      warnings.push('High transaction value');
    }

    // Check gas usage (potential honeypot indicator)
    if (transaction.gasUsed > 500000) {
      riskScore += 20;
      warnings.push('Unusually high gas usage');
    }

    // Check for suspicious patterns
    if (transaction.tokenTransfers && transaction.tokenTransfers.length > 5) {
      riskScore += 10;
      warnings.push('Multiple token transfers in single transaction');
    }

    // Contract interaction risk
    if (transaction.to && !this.isKnownContract(transaction.to)) {
      riskScore += 25;
      warnings.push('Interaction with unknown contract');
    }

    const level = this.getRiskLevel(riskScore);

    return {
      level,
      score: riskScore,
      warnings,
      shouldAlert: level === 'HIGH' || level === 'CRITICAL'
    };
  }

  /**
   * Calculate diversification risk
   */
  calculateDiversificationRisk(tokens) {
    const tokenCount = tokens.length;
    
    let score = 0;
    let status = '';

    if (tokenCount === 1) {
      score = 25;
      status = 'No diversification - all eggs in one basket';
    } else if (tokenCount === 2) {
      score = 20;
      status = 'Very limited diversification';
    } else if (tokenCount <= 5) {
      score = 12;
      status = 'Moderate diversification';
    } else if (tokenCount <= 10) {
      score = 5;
      status = 'Good diversification';
    } else {
      score = 2;
      status = 'Excellent diversification';
    }

    return { score, status, tokenCount };
  }

  /**
   * Calculate volatility risk based on token types
   */
  calculateVolatilityRisk(tokens) {
    const totalValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
    
    let volatilityScore = 0;
    const breakdown = {
      stablecoins: 0,
      bluechip: 0,
      altcoins: 0,
      memecoins: 0
    };

    tokens.forEach(token => {
      const percentage = (token.valueUSD / totalValue) * 100;
      
      if (this.isStablecoin(token.symbol)) {
        breakdown.stablecoins += percentage;
        volatilityScore += percentage * 0.05; // 5% volatility weight
      } else if (this.isBluechip(token.symbol)) {
        breakdown.bluechip += percentage;
        volatilityScore += percentage * 0.15; // 15% volatility weight
      } else if (this.isMemecoin(token.symbol)) {
        breakdown.memecoins += percentage;
        volatilityScore += percentage * 0.50; // 50% volatility weight
      } else {
        breakdown.altcoins += percentage;
        volatilityScore += percentage * 0.30; // 30% volatility weight
      }
    });

    // Normalize to 0-30 scale
    const normalizedScore = (volatilityScore / 100) * 30;

    let status = '';
    if (normalizedScore < 8) status = 'Low volatility portfolio';
    else if (normalizedScore < 15) status = 'Moderate volatility';
    else if (normalizedScore < 22) status = 'High volatility';
    else status = 'Extreme volatility';

    return {
      score: normalizedScore,
      status,
      breakdown
    };
  }

  /**
   * Calculate concentration risk (how much is in top holdings)
   */
  calculateConcentrationRisk(tokens) {
    const totalValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
    
    // Sort by value descending
    const sorted = [...tokens].sort((a, b) => b.valueUSD - a.valueUSD);
    
    // Calculate top holder percentages
    const top1Percent = sorted.length > 0 ? (sorted[0].valueUSD / totalValue) * 100 : 0;
    const top3Percent = sorted.slice(0, 3).reduce((sum, t) => sum + t.valueUSD, 0) / totalValue * 100;

    let score = 0;
    let status = '';

    if (top1Percent > 70) {
      score = 25;
      status = 'Extreme concentration in single asset';
    } else if (top1Percent > 50) {
      score = 20;
      status = 'Very high concentration';
    } else if (top1Percent > 30) {
      score = 15;
      status = 'High concentration';
    } else if (top3Percent > 80) {
      score = 10;
      status = 'Moderate concentration in top 3';
    } else {
      score = 3;
      status = 'Well-balanced distribution';
    }

    return {
      score,
      status,
      top1Percent: top1Percent.toFixed(1),
      top3Percent: top3Percent.toFixed(1),
      topHolding: sorted[0]?.symbol
    };
  }

  /**
   * Calculate liquidity risk
   */
  calculateLiquidityRisk(tokens) {
    let illiquidCount = 0;
    let totalValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
    let illiquidValue = 0;

    tokens.forEach(token => {
      // Simplified liquidity check - in production, check actual DEX liquidity
      if (token.valueUSD < 100 || this.isLowLiquidityToken(token.symbol)) {
        illiquidCount++;
        illiquidValue += token.valueUSD;
      }
    });

    const illiquidPercentage = (illiquidValue / totalValue) * 100;
    
    let score = 0;
    let status = '';

    if (illiquidPercentage > 50) {
      score = 20;
      status = 'High illiquidity risk';
    } else if (illiquidPercentage > 25) {
      score = 15;
      status = 'Moderate illiquidity';
    } else if (illiquidPercentage > 10) {
      score = 8;
      status = 'Some illiquid positions';
    } else {
      score = 2;
      status = 'Good liquidity';
    }

    return {
      score,
      status,
      illiquidTokens: illiquidCount,
      illiquidPercentage: illiquidPercentage.toFixed(1)
    };
  }

  /**
   * Generate recommendations based on risk factors
   */
  getRiskRecommendations(level, factors) {
    const recommendations = [];

    if (level === 'CRITICAL' || level === 'HIGH') {
      recommendations.push({
        priority: 'urgent',
        message: 'Consider immediate portfolio rebalancing',
        action: 'Reduce exposure to high-risk assets'
      });
    }

    if (factors.diversification.tokenCount < 3) {
      recommendations.push({
        priority: 'high',
        message: 'Increase diversification',
        action: 'Add 2-3 more quality tokens to spread risk'
      });
    }

    if (factors.volatility.breakdown.memecoins > 30) {
      recommendations.push({
        priority: 'high',
        message: 'High exposure to memecoins detected',
        action: 'Consider taking profits and rotating into bluechips'
      });
    }

    if (factors.concentration.top1Percent > 50) {
      recommendations.push({
        priority: 'medium',
        message: 'Portfolio heavily concentrated in one asset',
        action: 'Rebalance to reduce single-asset dependency'
      });
    }

    if (factors.volatility.breakdown.stablecoins < 10 && level !== 'LOW') {
      recommendations.push({
        priority: 'medium',
        message: 'No stable asset buffer',
        action: 'Consider allocating 10-20% to stablecoins'
      });
    }

    return recommendations;
  }

  /**
   * Determine risk level from score
   */
  getRiskLevel(score) {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  // ==================== TOKEN CLASSIFICATION ====================

  isStablecoin(symbol) {
    const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX'];
    return stablecoins.includes(symbol.toUpperCase());
  }

  isBluechip(symbol) {
    const bluechips = ['BTC', 'ETH', 'BNB', 'SOL', 'MATIC', 'AVAX', 'LINK', 'AURA'];
    return bluechips.includes(symbol.toUpperCase());
  }

  isMemecoin(symbol) {
    const memecoins = ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK'];
    return memecoins.includes(symbol.toUpperCase());
  }

  isLowLiquidityToken(symbol) {
    // In production, check actual DEX liquidity via AURA API
    // This is a simplified check
    const knownLiquid = [...this.getStablecoins(), ...this.getBluechips()];
    return !knownLiquid.includes(symbol.toUpperCase());
  }

  getStablecoins() {
    return ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX'];
  }

  getBluechips() {
    return ['BTC', 'ETH', 'BNB', 'SOL', 'MATIC', 'AVAX', 'LINK', 'AURA'];
  }

  isKnownContract(address) {
    // In production, maintain a database of known safe contracts
    // Or integrate with contract verification services
    const knownContracts = [
      '0x...', // Uniswap Router
      '0x...', // Aura contracts
      // Add more known safe contracts
    ];
    return knownContracts.some(known => 
      address.toLowerCase().startsWith(known.toLowerCase())
    );
  }
}