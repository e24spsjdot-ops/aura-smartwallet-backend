// services/auraService.js - Aura API + CoinGecko fallback (hybrid live data)
import axios from 'axios';
import fetch from 'node-fetch';
import { CacheService } from './cacheService.js';

export class AuraService {
  constructor() {
    this.cache = new CacheService();

    // ✅ Use correct Aura Adex public API base URL
    this.baseURL = process.env.AURA_API_URL || 'https://aura.adex.network/api';
    this.coingeckoBase = 'https://api.coingecko.com/api/v3';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * 🪙 Get wallet info
   */
  async getWalletData(address) {
    try {
      const response = await this.client.get(`/wallet/${address}`);
      return {
        address: response.data.address,
        balance: response.data.balance || 0,
        age: response.data.createdAt || null,
        lastActivity: response.data.lastTransaction || null,
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
   * 🧾 Token balances
   */
  async getTokenBalances(address) {
    try {
      const response = await this.client.get(`/token-balances/${address}`);
      return response.data.tokens.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        valueUSD: token.usdValue || 0,
        contractAddress: token.contractAddress,
        decimals: token.decimals,
      }));
    } catch (error) {
      console.warn('⚠️ Token balances fallback:', error.message);
      return this.getMockTokenBalances();
    }
  }

  /**
   * 🔍 Transactions
   */
  async getTransactions(address, limit = 20, offset = 0) {
    try {
      const response = await this.client.get(`/transactions/${address}`, {
        params: { limit, offset },
      });
      return response.data.transactions.map((tx) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: tx.timestamp,
        status: tx.status,
        gasUsed: tx.gasUsed,
        tokenTransfers: tx.tokenTransfers || [],
      }));
    } catch (error) {
      console.warn('⚠️ Transactions fallback:', error.message);
      return this.getMockTransactions(address);
    }
  }

  /**
   * 💰 Token price (Aura → CoinGecko fallback)
   */
  async getTokenPrice(symbol) {
    const cacheKey = `price:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // ✅ Try Aura price endpoint
      const response = await this.client.get(`/prices/${symbol}`);
      const result = {
        symbol,
        current: response.data.price,
        change24h: response.data.change24h,
        marketCap: response.data.marketCap,
        volume24h: response.data.volume24h,
        source: 'AURA',
      };
      await this.cache.set(cacheKey, result, 300);
      return result;
    } catch (auraError) {
      console.warn(`⚠️ Aura price failed for ${symbol}, using CoinGecko`);
      try {
        const idMap = { ETH: 'ethereum', BTC: 'bitcoin', AURA: 'aura-network', USDC: 'usd-coin' };
        const id = idMap[symbol.toUpperCase()] || symbol.toLowerCase();

        const res = await fetch(
          `${this.coingeckoBase}/simple/price?ids=${id}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
        );
        const data = await res.json();
        const priceInfo = data[id];
        const result = {
          symbol,
          current: priceInfo.usd,
          change24h: priceInfo.usd_24h_change,
          marketCap: priceInfo.usd_market_cap,
          volume24h: priceInfo.usd_24h_vol,
          source: 'COINGECKO',
        };
        await this.cache.set(cacheKey, result, 300);
        return result;
      } catch (cgError) {
        console.error('❌ Price fetch failed:', cgError.message);
        return this.getMockPriceData(symbol);
      }
    }
  }

  /**
   * 🌍 Market conditions (Aura → CoinGecko fallback)
   */
  async getMarketConditions() {
    const cacheKey = 'market:conditions';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // ✅ Try Aura market overview first
      const response = await this.client.get(`/market/overview`);
      const result = {
        totalMarketCap: response.data.totalMarketCap,
        btcDominance: response.data.btcDominance,
        fearGreedIndex: response.data.fearGreedIndex,
        trending: response.data.trending || [],
        source: 'AURA',
      };
      await this.cache.set(cacheKey, result, 120);
      return result;
    } catch (auraError) {
      console.warn('⚠️ Aura market API failed, using CoinGecko fallback');
      try {
        const [globalRes, trendingRes] = await Promise.all([
          fetch(`${this.coingeckoBase}/global`),
          fetch(`${this.coingeckoBase}/search/trending`),
        ]);
        const globalData = await globalRes.json();
        const trendingData = await trendingRes.json();

        const result = {
          totalMarketCap: globalData.data.total_market_cap.usd,
          btcDominance: globalData.data.market_cap_percentage.btc,
          fearGreedIndex: 50,
          trending: trendingData.coins.map((c) => c.item.symbol).slice(0, 5),
          source: 'COINGECKO',
        };
        await this.cache.set(cacheKey, result, 120);
        return result;
      } catch (cgError) {
        console.error('❌ Both Aura & CoinGecko failed:', cgError.message);
        return this.getMockMarketConditions();
      }
    }
  }

  /**
   * 💡 Investment strategies (Aura or mock)
   */
  async getInvestmentStrategies(address) {
    try {
      const response = await this.client.get(`/strategies/${address}`);
      return response.data.strategies || [];
    } catch (error) {
      console.warn('⚠️ Using mock strategies');
      return this.getMockStrategies();
    }
  }

  /**
   * 🧩 Combine all portfolio data
   */
  async getPortfolioWithStrategies(address) {
    const [wallet, tokens, strategies] = await Promise.all([
      this.getWalletData(address),
      this.getTokenBalances(address),
      this.getInvestmentStrategies(address),
    ]);

    return {
      version: '1.1',
      wallet,
      tokens,
      strategies,
      timestamp: new Date().toISOString(),
    };
  }

  // ========== Error Handler ==========
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

  // ========== Mock Data ==========
  getMockWalletData(address) {
    return {
      address,
      balance: 1250.75,
      age: new Date('2023-06-15').toISOString(),
      lastActivity: new Date().toISOString(),
    };
  }

  getMockTokenBalances() {
    return [
      { symbol: 'AURA', name: 'Aura Network', balance: 5000, valueUSD: 2500 },
      { symbol: 'ETH', name: 'Ethereum', balance: 0.5, valueUSD: 1800 },
      { symbol: 'USDC', name: 'USD Coin', balance: 1000, valueUSD: 1000 },
      { symbol: 'LINK', name: 'Chainlink', balance: 50, valueUSD: 850 },
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
      },
    ];
  }

  getMockPriceData(symbol) {
    const prices = {
      AURA: { current: 0.5, change24h: 5.2 },
      ETH: { current: 3600, change24h: -2.1 },
      USDC: { current: 1.0, change24h: 0 },
      LINK: { current: 17, change24h: 3.8 },
    };
    const data = prices[symbol] || { current: 1, change24h: 0 };
    return {
      symbol,
      ...data,
      marketCap: data.current * 1e9,
      volume24h: data.current * 5e7,
      source: 'MOCK',
    };
  }

  getMockMarketConditions() {
    return {
      totalMarketCap: 2.5e12,
      btcDominance: 48.5,
      fearGreedIndex: 65,
      trending: ['BTC', 'ETH', 'AURA'],
      source: 'MOCK',
    };
  }

  getMockStrategies() {
    return [
      {
        id: 1,
        name: 'Balanced Yield Strategy',
        description: 'Steady staking rewards.',
        risk: 'Medium',
      },
      {
        id: 2,
        name: 'Aggressive Growth',
        description: 'High-risk, high-reward.',
        risk: 'High',
      },
    ];
  }
}
