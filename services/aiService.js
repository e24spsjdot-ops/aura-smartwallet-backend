// services/aiService.js - AI-powered analysis using OpenAI
import OpenAI from 'openai';

export class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-5-nano';
  }

  /**
   * 🎯 ENHANCED: Analyze portfolio combining AURA + MY Risk Analysis
   */
  async analyzePortfolio(data) {
    const { address, tokens, transactions, riskScore, totalValue, auraStrategies } = data;

    const prompt = this.buildEnhancedAnalysisPrompt({
      tokens,
      riskScore,
      totalValue,
      auraStrategies
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert crypto portfolio analyst who provides personalized, actionable insights. You evaluate external AI recommendations (like AURA) and add context based on risk analysis, market conditions, and user-specific factors.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1200
      });

      const analysis = response.choices[0].message.content;

      return {
        summary: this.extractSummary(analysis),
        keyInsights: this.extractKeyInsights(analysis),
        auraEvaluation: this.extractAuraEvaluation(analysis),
        personalizedPlan: this.extractActionPlan(analysis),
        warnings: this.extractWarnings(analysis),
        fullAnalysis: analysis,
        confidence: this.calculateConfidence(tokens, transactions, auraStrategies)
      };
    } catch (error) {
      // 🧹 Clean fallback logging
      const msg = error?.error?.message || error?.message || 'Unknown AI error';

      if (msg.includes('quota') || msg.includes('insufficient_quota')) {
        console.warn('⚠️  OpenAI quota exhausted — switching to rule-based fallback.');
      } else if (msg.includes('model') || msg.includes('not exist')) {
        console.warn('⚠️  Invalid or missing model — switching to rule-based fallback.');
      } else if (msg.includes('429') || msg.includes('rate limit')) {
        console.warn('⚠️  Rate limit hit — retry later.');
      } else {
        console.warn(`⚠️  AI service issue: ${msg}`);
      }

      // Return a graceful fallback (no stack trace)
      try {
        return await this.getLLMEnhancedAnalysis(data);
      } catch {
        return this.getRuleBasedEnhancedAnalysis(data);
      }
    }

  }

  /**
   * 🎯 NEW: Get market context
   */
  async getMarketContext() {
    const prompt = `Provide current crypto market context:
    
1. Overall market sentiment (bullish/bearish/neutral)
2. Key factors affecting the market right now
3. General advice for portfolio management in current conditions
4. Risk level for new investments (low/medium/high)

Be concise and actionable.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a crypto market analyst providing real-time market context.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 400
      });

      const context = response.choices[0].message.content;

      return {
        sentiment: this.extractSentiment(context),
        keyFactors: this.extractKeyFactors(context),
        advice: this.extractAdvice(context),
        riskLevel: this.extractRiskLevel(context),
        fullContext: context,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting market context:', error.message);
      return this.getDefaultMarketContext();
    }
  }

  /**
   * 🎯 NEW: Assess platform safety
   */
  async assessPlatformSafety(platformName, operation) {
    const prompt = `Evaluate the safety of using ${platformName} for ${operation}:

1. Is this platform well-established and reputable?
2. Any recent security incidents or concerns?
3. TVL (Total Value Locked) status?
4. Community trust level?
5. Should users proceed with caution?

Provide honest, safety-first assessment.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a DeFi security analyst. Prioritize user safety.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      const assessment = response.choices[0].message.content;

      return {
        platform: platformName,
        operation,
        safetyRating: this.extractSafetyRating(assessment),
        concerns: this.extractConcerns(assessment),
        recommendation: this.extractRecommendation(assessment),
        fullAssessment: assessment
      };
    } catch (error) {
      console.error('Error assessing platform:', error.message);
      return {
        platform: platformName,
        safetyRating: 'UNKNOWN',
        concerns: ['Unable to assess - proceed with caution'],
        recommendation: 'Research this platform thoroughly before proceeding'
      };
    }
  }

  /**
   * 🎯 ENHANCED: Predict swap timing with market context
   */
  async predictSwapTiming(fromToken, toToken, amount, marketContext) {
    const prompt = `Analyze optimal timing for swapping ${amount} ${fromToken} to ${toToken}.

Current Market Context:
${marketContext ? JSON.stringify(marketContext, null, 2) : 'Market data unavailable'}

Consider:
- Current market volatility
- Gas fee patterns
- Recent price trends
- Market sentiment

Provide:
1. Recommended timing
2. Confidence level (0-100%)
3. Key reasoning
4. Potential savings
5. Risk of waiting`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a crypto trading timing specialist.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 400
      });

      const prediction = response.choices[0].message.content;

      return {
        fromToken,
        toToken,
        amount,
        timing: this.extractTiming(prediction),
        confidence: this.extractConfidenceLevel(prediction),
        reasoning: this.extractReasoning(prediction),
        potentialSavings: this.extractSavings(prediction),
        risks: this.extractRisks(prediction),
        fullPrediction: prediction,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error predicting swap timing:', error.message);
      return this.getDefaultSwapTiming(fromToken, toToken, amount);
    }
  }

  /**
   * 🎯 NEW: Calculate tax implications
   */
  async calculateTaxImpact(transaction, userLocation = 'US') {
    const prompt = `Estimate tax implications for this crypto transaction in ${userLocation}:

Transaction:
- Type: ${transaction.type || 'Swap'}
- From: ${transaction.fromToken} (${transaction.fromAmount})
- To: ${transaction.toToken} (${transaction.toAmount})
- Value: $${transaction.valueUSD || 0}

Provide:
1. Is this taxable?
2. Tax category
3. Rough estimate
4. Considerations
5. Optimization advice

Note: Educational only, not professional advice.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a crypto tax educator. Always remind users to consult professionals.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 400
      });

      const taxAnalysis = response.choices[0].message.content;

      return {
        isTaxable: this.extractTaxableStatus(taxAnalysis),
        category: this.extractTaxCategory(taxAnalysis),
        estimatedImpact: this.extractTaxImpact(taxAnalysis),
        considerations: this.extractConsiderations(taxAnalysis),
        optimization: this.extractOptimization(taxAnalysis),
        fullAnalysis: taxAnalysis,
        disclaimer: 'Educational only. Consult a tax professional.'
      };
    } catch (error) {
      console.error('Error calculating tax:', error.message);
      return {
        isTaxable: true,
        category: 'Unknown',
        estimatedImpact: 'Unable to calculate',
        disclaimer: 'Consult a tax professional.'
      };
    }
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations(data) {
    const { tokens, riskScore, marketConditions, auraStrategies } = data;

    const prompt = `Generate recommendations for this portfolio:

Tokens: ${JSON.stringify(tokens.slice(0, 5), null, 2)}
Risk: ${riskScore.score}/100 (${riskScore.level})
AURA Strategies: ${JSON.stringify(auraStrategies, null, 2)}
Market: ${JSON.stringify(marketConditions, null, 2)}

Provide 3-5 specific recommendations ranked by priority.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a strategic crypto advisor.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 800
      });

      return this.parseRecommendations(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating recommendations:', error.message);
      return this.getDefaultRecommendations(tokens, riskScore, auraStrategies);
    }
  }

  /**
   * Assess transaction risk
   */
  async assessTransactionRisk(transaction) {
    const prompt = `Evaluate this transaction for risk:

From: ${transaction.from}
To: ${transaction.to}
Value: ${transaction.value}
Gas: ${transaction.gasUsed || 'Unknown'}

Check for scam indicators. Provide risk level and explanation.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a blockchain security analyst.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 250
      });

      return this.parseRiskAssessment(response.choices[0].message.content);
    } catch (error) {
      console.error('Error assessing risk:', error.message);
      return { 
        level: 'UNKNOWN', 
        explanation: 'Unable to assess',
        shouldProceed: 'Caution'
      };
    }
  }

 // ==================== HELPER METHODS ====================

  buildEnhancedAnalysisPrompt(data) {
    // Safely extract and set defaults
    const {
      tokens = [],
      riskScore = {
        score: 0,
        level: 'Unknown',
        factors: {
          diversification: { status: 'N/A' },
          volatility: { status: 'N/A' },
        },
      },
      totalValue = 0,
      auraStrategies = [],
    } = data || {};

    const tokenSummary = tokens
      .slice(0, 5)
      .map((t) => {
        const valueUSD = Number(t?.valueUSD || 0);
        const percentage = totalValue
          ? ((valueUSD / totalValue) * 100).toFixed(1)
          : '0.0';
        return `- ${t?.symbol || 'UNKNOWN'}: $${valueUSD.toFixed(
          2
        )} (${percentage}%)`;
      })
      .join('\n');

    return `Analyze this crypto portfolio:

  PORTFOLIO:
  Total: $${Number(totalValue || 0).toFixed(2)}
  ${tokenSummary}

  RISK ANALYSIS:
  Score: ${riskScore.score || 0}/100 (${riskScore.level || 'N/A'})
  Diversification: ${riskScore.factors?.diversification?.status || 'N/A'}
  Volatility: ${riskScore.factors?.volatility?.status || 'N/A'}

  AURA RECOMMENDATIONS:
  ${auraStrategies?.length
      ? JSON.stringify(auraStrategies, null, 2)
      : 'None'}

  Provide:
  1. Portfolio health assessment
  2. Evaluate AURA's recommendations
  3. Identify hidden risks
  4. Personalized action plan`;
  }

  extractSummary(text) {
    const lines = text.split('\n').filter((l) => l.trim());
    return lines[0] || text.substring(0, 200);
  }

  extractKeyInsights(text) {
    const insights = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.match(/^\d+\./) || line.match(/^[-•]/)) {
        insights.push(
          line
            .replace(/^\d+\.\s*/, '')
            .replace(/^[-•]\s*/, '')
            .trim()
        );
      }
    }

    return insights.length > 0
      ? insights.slice(0, 5)
      : [text.substring(0, 150)];
  }

  extractAuraEvaluation(text) {
    const lines = text.split('\n');
    const auraLine = lines.find((l) => l.toLowerCase().includes('aura'));
    return auraLine || 'AURA strategies evaluated';
  }

  extractActionPlan(text) {
    const plan = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.match(/^\d+\./) || line.match(/^[-•]/)) {
        plan.push(
          line
            .replace(/^\d+\.\s*/, '')
            .replace(/^[-•]\s*/, '')
            .trim()
        );
      }
    }

    return plan.length > 0
      ? plan
      : ['Review portfolio', 'Consider recommendations'];
  }

  extractWarnings(text) {
    const warnings = [];
    const keywords = ['warning', 'caution', 'risk', 'concern'];
    const lines = text.split('\n');

    for (const line of lines) {
      if (keywords.some((k) => line.toLowerCase().includes(k))) {
        warnings.push(line.trim());
      }
    }

    return warnings.slice(0, 3);
  }

  extractSentiment(text) {
    const lower = text.toLowerCase();
    if (lower.includes('bullish') || lower.includes('positive')) return 'Bullish';
    if (lower.includes('bearish') || lower.includes('negative')) return 'Bearish';
    return 'Neutral';
  }

  extractKeyFactors(text) {
    const lines = text.split('\n');
    return lines
      .filter((l) => l.match(/[-•\d]\./))
      .map((l) => l.replace(/^[-•\d]+\.\s*/, '').trim())
      .slice(0, 3);
  }

  extractAdvice(text) {
    const lines = text.split('\n');
    const adviceLine = lines.find(
      (l) =>
        l.toLowerCase().includes('advice') ||
        l.toLowerCase().includes('recommend')
    );
    return adviceLine || 'Monitor market conditions';
  }

  extractRiskLevel(text) {
    const lower = text.toLowerCase();
    if (lower.includes('high risk')) return 'HIGH';
    if (lower.includes('low risk')) return 'LOW';
    return 'MEDIUM';
  }

  extractSafetyRating(text) {
    const lower = text.toLowerCase();
    if (lower.includes('safe') && !lower.includes('not safe')) return 'SAFE';
    if (lower.includes('risky') || lower.includes('caution')) return 'RISKY';
    if (lower.includes('avoid')) return 'UNSAFE';
    return 'MODERATE';
  }

  extractConcerns(text) {
    const concerns = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (
        line.toLowerCase().includes('concern') ||
        line.toLowerCase().includes('risk') ||
        line.toLowerCase().includes('warning')
      ) {
        concerns.push(line.trim());
      }
    }

    return concerns.length > 0 ? concerns : ['Standard risks apply'];
  }

  extractRecommendation(text) {
    const lines = text.split('\n');
    const recLine = lines.find(
      (l) =>
        l.toLowerCase().includes('recommend') ||
        l.toLowerCase().includes('should')
    );
    return recLine || 'Proceed with normal caution';
  }

  extractTiming(text) {
    const lower = text.toLowerCase();
    if (lower.includes('now') || lower.includes('immediately')) return 'Execute now';
    if (lower.includes('1-3 hour')) return 'Wait 1-3 hours';
    if (lower.includes('6-12 hour')) return 'Wait 6-12 hours';
    if (lower.includes('24') || lower.includes('day')) return 'Wait 24+ hours';
    return 'Analyze market conditions';
  }

  extractConfidenceLevel(text) {
    const match = text.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 60;
  }

  extractReasoning(text) {
    const lines = text.split('\n');
    const reasonLine = lines.find(
      (l) =>
        l.toLowerCase().includes('reason') ||
        l.toLowerCase().includes('because')
    );
    return reasonLine || text.substring(0, 150);
  }

  extractSavings(text) {
    const match = text.match(/(\d+\.?\d*)%/);
    return match ? parseFloat(match[1]) : 0;
  }

  extractRisks(text) {
    const lines = text.split('\n');
    const riskLines = lines.filter(
      (l) =>
        l.toLowerCase().includes('risk') ||
        l.toLowerCase().includes('downside')
    );
    return riskLines.length > 0 ? riskLines : ['Market volatility'];
  }

  extractTaxableStatus(text) {
    return (
      text.toLowerCase().includes('taxable') &&
      !text.toLowerCase().includes('not taxable')
    );
  }

  extractTaxCategory(text) {
    const lower = text.toLowerCase();
    if (lower.includes('short-term')) return 'Short-term capital gains';
    if (lower.includes('long-term')) return 'Long-term capital gains';
    if (lower.includes('income')) return 'Income';
    return 'Capital gains';
  }

  extractTaxImpact(text) {
    const match = text.match(/\$(\d+\.?\d*)/);
    return match ? `Approximately $${match[1]}` : 'Varies by tax bracket';
  }

  extractConsiderations(text) {
    const lines = text.split('\n');
    return lines
      .filter(l => l.match(/[-•\d]\./))
      .map(l => l.replace(/^[-•\d]+\.\s*/, '').trim())
      .slice(0, 3);
  }

  extractOptimization(text) {
    const lines = text.split('\n');
    const optLine = lines.find(l => 
      l.toLowerCase().includes('optimiz') || 
      l.toLowerCase().includes('minimize')
    );
    return optLine || 'Consider timing and holding period';
  }

  calculateConfidence(tokens, transactions, auraStrategies) {
    let conf = 70;
    if (tokens && tokens.length >= 3) conf += 10;
    if (transactions && transactions.length >= 10) conf += 5;
    if (auraStrategies && auraStrategies.length > 0) conf += 10;
    return Math.min(conf, 95);
  }

  parseRiskAssessment(text) {
    const level = text.match(/(LOW|MEDIUM|HIGH|CRITICAL)/i)?.[0].toUpperCase() || 'MEDIUM';
    const shouldProceed = text.toLowerCase().includes('should not') || text.toLowerCase().includes('avoid') 
      ? 'No' 
      : text.toLowerCase().includes('caution') 
        ? 'Caution' 
        : 'Yes';
    
    return {
      level,
      explanation: text.replace(level, '').trim(),
      shouldProceed,
      concerns: this.extractConcerns(text)
    };
  }

  parseRecommendations(text) {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Parse from text
    }

    const recs = [];
    const lines = text.split('\n');
    
    let current = {};
    for (const line of lines) {
      if (line.match(/action:/i)) {
        if (current.action) recs.push(current);
        current = { action: line.split(':')[1]?.trim() || '' };
      } else if (line.match(/reasoning:/i)) {
        current.reasoning = line.split(':')[1]?.trim() || '';
      } else if (line.match(/priority:/i)) {
        current.priority = line.split(':')[1]?.trim() || 'Medium';
      }
    }
    
    if (current.action) recs.push(current);
    return recs.length > 0 ? recs : [];
  }

  // Fallback methods

  getDefaultMarketContext() {
    return {
      sentiment: 'Neutral',
      keyFactors: ['Market volatility present'],
      advice: 'Exercise caution',
      riskLevel: 'MEDIUM',
      timestamp: new Date().toISOString()
    };
  }

  getRuleBasedEnhancedAnalysis(data) {
    const { tokens = [], riskScore = {}, totalValue = 0, auraStrategies = [] } = data;

    // Safely handle missing or invalid totalValue
    const safeTotal = Number.isFinite(totalValue) ? totalValue.toFixed(2) : '0.00';
    const riskLevel = riskScore?.level || 'UNKNOWN';

    let summary = `Portfolio: $${safeTotal}, Risk: ${riskLevel}. `;

    if (auraStrategies.length > 0) {
      summary += `AURA recommends ${auraStrategies.length} strategies. `;
    }

    if (riskLevel === 'HIGH') {
      summary += 'Consider rebalancing first.';
    }

    return {
      summary,
      keyInsights: [`${tokens.length} tokens`, `Risk: ${riskLevel}`],
      auraEvaluation: auraStrategies.length > 0 ? 'AURA strategies available' : 'No AURA strategies',
      personalizedPlan: ['Review risk', 'Evaluate AURA'],
      warnings: riskLevel === 'HIGH' ? ['High risk detected'] : [],
      fullAnalysis: 'Using rule-based assessment',
      confidence: 50
    };
  }

  async getLLMEnhancedAnalysis(data) {
    const prompt = this.buildEnhancedAnalysisPrompt(data);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // or whichever model you're using
        messages: [
          { role: "system", content: "You are a crypto portfolio analyst that provides concise, insightful evaluations." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });

      const aiText = response.choices[0].message.content;

      return {
        summary: this.extractSummary(aiText),
        keyInsights: this.extractKeyInsights(aiText),
        auraEvaluation: this.extractAuraEvaluation(aiText),
        personalizedPlan: this.extractActionPlan(aiText),
        warnings: this.extractWarnings(aiText),
        fullAnalysis: aiText,
        confidence: this.extractConfidenceLevel(aiText)
      };
    } catch (err) {
      console.error('AI Analysis failed:', err);
      // fallback to rule-based
      return this.getRuleBasedEnhancedAnalysis(data);
    }
  }


  getDefaultRecommendations(tokens, riskScore, auraStrategies) {
    const recs = [];
    
    if (auraStrategies && auraStrategies.length > 0) {
      recs.push({
        action: 'Review AURA strategies',
        reasoning: 'AI-generated opportunities available',
        priority: 'High'
      });
    }
    
    if (riskScore && riskScore.level === 'HIGH') {
      recs.push({
        action: 'Reduce portfolio risk',
        reasoning: 'Risk score is elevated',
        priority: 'Urgent'
      });
    }

    if (recs.length === 0) {
      recs.push({
        action: 'Monitor portfolio',
        reasoning: 'Portfolio appears balanced',
        priority: 'Low'
      });
    }

    return recs;
  }

  getDefaultSwapTiming(from, to, amount) {
    return {
      fromToken: from,
      toToken: to,
      amount,
      timing: 'Analyze market',
      confidence: 50,
      reasoning: 'Monitor gas fees and volatility',
      potentialSavings: 0,
      risks: ['Market volatility'],
      timestamp: new Date().toISOString()
    };
  }
    // ==================== PARSING HELPERS ====================

  extractSummary(text) {
    const match = text.match(/Summary[:\-]?\s*(.+?)(?:\n|$)/i);
    return match ? match[1].trim() : text.split('\n')[0].slice(0, 180);
  }

  extractKeyInsights(text) {
    const match = text.match(/Insights[:\-]?\s*([\s\S]+?)(?:\n\n|Recommendations|Actions|$)/i);
    if (match) {
      return match[1]
        .split('\n')
        .map(l => l.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);
    }
    // fallback: take 2–3 interesting lines
    return text
      .split('\n')
      .filter(line => line.length > 20)
      .slice(0, 3);
  }

  extractAuraEvaluation(text) {
    const match = text.match(/AURA(?:\s+Evaluation|):\s*(.+)/i);
    return match ? match[1].trim() : 'AURA integration analyzed';
  }

  extractActionPlan(text) {
    const match = text.match(/Recommendations[:\-]?\s*([\s\S]+?)(?:\n\n|Warnings|$)/i);
    if (match) {
      return match[1]
        .split('\n')
        .map(l => l.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);
    }
    return ['Hold stable tokens', 'Review portfolio quarterly'];
  }

  extractWarnings(text) {
    const match = text.match(/Warnings[:\-]?\s*([\s\S]+?)(?:\n\n|$)/i);
    if (match) {
      return match[1]
        .split('\n')
        .map(l => l.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);
    }
    return [];
  }

  calculateConfidence(tokens, transactions, auraStrategies) {
    const base = 70;
    const hasTransactions = transactions && transactions.length > 5;
    const hasStrategies = auraStrategies && auraStrategies.length > 0;
    const diversityBonus = tokens && tokens.length > 3 ? 10 : 0;
    return Math.min(100, base + (hasTransactions ? 10 : 0) + (hasStrategies ? 10 : 0) + diversityBonus);
  }

}