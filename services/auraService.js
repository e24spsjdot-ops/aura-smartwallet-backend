// services/auraService.js - Handles all AURA API interactions
import axios from 'axios';

export class AuraService {
  constructor() {
    // REAL AURA API endpoint from documentation
    this.baseURL = process.env.AURA_API_URL || 'https://aura.adex.network';
    // AURA API is public - no API key needed!

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // Increased timeout for AI processing
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    );
  }

  /**
   * Get wallet data from AURA
   */
  async getWalletData(address) {
    try {
      const response = await this.client.get(`/v1/accounts/${address}`);
      return {
        address: response.data.address,
        balance: response.data.balance || 0,
        age: response.data.createdAt || null,
        lastActivity: response.data.lastTransaction || null
      };
    } catch (error) {
      console.error('Error fetching wallet data:', error.message);
      if (process.env.NODE_ENV === 'development') {
        return this.getMockWalletData(address);
      }
      throw error;
    }
  }

  /**
   * Get token balances for a wallet
   */
  async getTokenBalances(address) {
    try {
      const response = await this.client.get(`/v1/accounts/${address}/tokens`);
      return response.data.tokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        valueUSD: token.usdValue || 0,
        contractAddress: token.contractAddress,
        decimals: token.decimals
      }));
    } catch (error) {
      console.error('Error fetching token balances:', error.message);
      if (process.env.NODE_ENV === 'development') {
        return this.getMockTokenBalances();
      }
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(address, limit = 20, offset = 0) {
    try {
      const response = await this.client.get(`/v1/accounts/${address}/transactions`, {
        params: { limit, offset }
      });
      return response.data.transactions.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: tx.timestamp,
        status: tx.status,
        gasUsed: tx.gasUsed,
        tokenTransfers: tx.tokenTransfers || []
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error.message);
      if (process.env.NODE_ENV === 'development') {
        return this.getMockTransactions(address);
      }
      throw error;
    }
  }

  /**
   * Get current token price and market data
   */
  async getTokenPrice(symbol) {
    try {
      const response = await this.client.get(`/v1/tokens/${symbol}/price`);
      return {
        symbol,
        current: response.data.price,
        change24h: response.data.change24h,
        marketCap: response.data.marketCap,
        volume24h: response.data.volume24h
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error.message);
      if (process.env.NODE_ENV === 'development') {
        return this.getMockPriceData(symbol);
      }
      throw error;
    }
  }

  /**
   * Get overall market conditions
   */
  async getMarketConditions() {
    try {
      const response = await this.client.get('/v1/market/overview');
      return {
        totalMarketCap: response.data.totalMarketCap,
        btcDominance: response.data.btcDominance,
        fearGreedIndex: response.data.fearGreedIndex,
        trending: response.data.trending || []
      };
    } catch (error) {
      console.error('Error fetching market conditions:', error.message);
      if (process.env.NODE_ENV === 'development') {
        return this.getMockMarketConditions();
      }
      throw error;
    }
  }

  /**
   * Get investment strategies (if available)
   */
  async getInvestmentStrategies(address) {
    try {
      // Replace with real Aura endpoint if exists, else mock
      const response = await this.client.get(`/v1/accounts/${address}/strategies`);
      return response.data.strategies || [];
    } catch (error) {
      console.error('Error fetching strategies:', error.message);
      if (process.env.NODE_ENV === 'development') {
        return this.getMockStrategies();
      }
      throw error;
    }
  }

  /**
   * ✅ Combines wallet data + strategies for portfolio analysis
   */
  async getPortfolioWithStrategies(address) {
    try {
      const [wallet, tokens, strategies] = await Promise.all([
        this.getWalletData(address),
        this.getTokenBalances(address),
        this.getInvestmentStrategies(address)
      ]);

      return {
        version: '1.0',
        wallet,
        tokens,
        strategies,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error combining portfolio data:', error.message);
      throw error;
    }
  }

  /**
   * Error handler
   */
  handleError(error) {
    if (error.response) {
      const message = error.response.data?.message || 'AURA API error';
      throw new Error(`AURA API: ${message} (${error.response.status})`);
    } else if (error.request) {
      throw new Error('AURA API is unreachable');
    } else {
      throw error;
    }
  }

  // ==================== MOCK DATA FOR DEVELOPMENT ====================

  getMockWalletData(address) {
    return {
      address,
      balance: 1250.75,
      age: new Date('2023-06-15').toISOString(),
      lastActivity: new Date().toISOString()
    };
  }

  getMockTokenBalances() {
    return [
      { symbol: 'AURA', name: 'Aura Network', balance: 5000, valueUSD: 2500, contractAddress: '0x123...', decimals: 18 },
      { symbol: 'ETH', name: 'Ethereum', balance: 0.5, valueUSD: 1800, contractAddress: '0x456...', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', balance: 1000, valueUSD: 1000, contractAddress: '0x789...', decimals: 6 },
      { symbol: 'LINK', name: 'Chainlink', balance: 50, valueUSD: 850, contractAddress: '0xabc...', decimals: 18 }
    ];
  }

  getMockTransactions(address) {
    return [
      {
        hash: '0x1234abcd...',
        from: address,
        to: '0x9876...',
        value: 100,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'success',
        gasUsed: 21000,
        tokenTransfers: []
      }
    ];
  }

  getMockPriceData(symbol) {
    const prices = {
      'AURA': { current: 0.50, change24h: 5.2 },
      'ETH': { current: 3600, change24h: -2.1 },
      'USDC': { current: 1.0, change24h: 0.0 },
      'LINK': { current: 17, change24h: 3.8 }
    };
    const data = prices[symbol] || { current: 1, change24h: 0 };
    return {
      symbol,
      ...data,
      marketCap: data.current * 1000000000,
      volume24h: data.current * 50000000
    };
  }

  getMockMarketConditions() {
    return {
      totalMarketCap: 2500000000000,
      btcDominance: 48.5,
      fearGreedIndex: 65,
      trending: ['BTC', 'ETH', 'AURA']
    };
  }

  getMockStrategies() {
    return [
      { id: 1, name: 'Balanced Yield Strategy', description: 'Focuses on steady staking rewards.', risk: 'Medium' },
      { id: 2, name: 'Aggressive Growth', description: 'Targets high-risk, high-reward opportunities.', risk: 'High' }
    ];
  }
}