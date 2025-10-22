# 📁 AURA SmartWallet AI - Complete Project Structure

## Full Directory Tree

```
aura-smartwallet-backend/
│
├── 📄 server.js                      # Main Express application entry point
├── 📄 package.json                   # Dependencies and scripts
├── 📄 .env.example                   # Environment variables template
├── 📄 .env                           # Your actual env vars (NOT in git)
├── 📄 .gitignore                     # Git ignore rules
├── 📄 README.md                      # Main documentation
├── 📄 PROJECT_STRUCTURE.md           # This file
│
├── 📁 controllers/                   # Business logic layer
│   ├── walletController.js          # Wallet operations
│   ├── analysisController.js        # AI analysis logic
│   └── alertController.js           # Alert management
│
├── 📁 services/                      # Core service layer
│   ├── auraService.js               # AURA API integration
│   ├── aiService.js                 # OpenAI/AI logic
│   ├── riskAnalyzer.js              # Risk calculation engine
│   ├── alertService.js              # Alert monitoring system
│   └── cacheService.js              # In-memory caching
│
├── 📁 routes/                        # API route definitions
│   ├── wallet.js                    # /api/wallet/* endpoints
│   ├── analysis.js                  # /api/analysis/* endpoints
│   └── alerts.js                    # /api/alerts/* endpoints
│
├── 📁 middleware/                    # Express middleware
│   ├── errorHandler.js              # Global error handling
│   ├── validators.js                # Input validation
│   └── logger.js                    # Request logging
│
├── 📁 utils/                         # Utility functions (optional)
│   ├── constants.js                 # App constants
│   └── helpers.js                   # Helper functions
│
├── 📁 config/                        # Configuration files (optional)
│   └── database.js                  # DB config (future)
│
└── 📁 tests/                         # Test files (optional)
    ├── wallet.test.js
    ├── analysis.test.js
    └── alerts.test.js
```

## 🔄 Data Flow Architecture

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────────────────┐
│         Express Server               │
│  ┌──────────────────────────────┐  │
│  │     Middleware Layer          │  │
│  │  • CORS                       │  │
│  │  • Rate Limiting              │  │
│  │  • Validation                 │  │
│  │  • Logging                    │  │
│  └───────────┬──────────────────┘  │
│              │                      │
│  ┌───────────▼──────────────────┐  │
│  │      Routes Layer             │  │
│  │  • /api/wallet                │  │
│  │  • /api/analysis              │  │
│  │  • /api/alerts                │  │
│  └───────────┬──────────────────┘  │
│              │                      │
│  ┌───────────▼──────────────────┐  │
│  │    Controllers Layer          │  │
│  │  Business Logic               │  │
│  └───────────┬──────────────────┘  │
│              │                      │
│  ┌───────────▼──────────────────┐  │
│  │     Services Layer            │  │
│  │  ┌────────────────────────┐  │  │
│  │  │   AURA Service         │  │  │
│  │  │   (Blockchain Data)    │  │  │
│  │  └────────────────────────┘  │  │
│  │  ┌────────────────────────┐  │  │
│  │  │   AI Service           │  │  │
│  │  │   (OpenAI Analysis)    │  │  │
│  │  └────────────────────────┘  │  │
│  │  ┌────────────────────────┐  │  │
│  │  │   Risk Analyzer        │  │  │
│  │  │   (Risk Calculation)   │  │  │
│  │  └────────────────────────┘  │  │
│  │  ┌────────────────────────┐  │  │
│  │  │   Alert Service        │  │  │
│  │  │   (Monitoring)         │  │  │
│  │  └────────────────────────┘  │  │
│  │  ┌────────────────────────┐  │  │
│  │  │   Cache Service        │  │  │
│  │  │   (Performance)        │  │  │
│  │  └────────────────────────┘  │  │
│  └───────────┬──────────────────┘  │
└──────────────┼──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│  AURA API   │  │  OpenAI API │
│  Network    │  │  (GPT-4)    │
└─────────────┘  └─────────────┘
```

## 🔌 API Integration Points

### 1. AURA API (Primary Data Source)
```javascript
// services/auraService.js
- getWalletData(address)
- getTokenBalances(address)
- getTransactions(address, limit, offset)
- getTokenPrice(symbol)
- getMarketConditions()
```

### 2. OpenAI API (AI Intelligence)
```javascript
// services/aiService.js
- analyzePortfolio(data)
- generateRecommendations(data)
- predictSwapTiming(fromToken, toToken, amount)
- assessTransactionRisk(transaction)
```

### 3. Internal Services
```javascript
// services/riskAnalyzer.js
- calculatePortfolioRisk(data)
- assessTransactionRisk(transaction)
- calculateDiversificationRisk(tokens)
- calculateVolatilityRisk(tokens)
- calculateConcentrationRisk(tokens)
- calculateLiquidityRisk(tokens)

// services/alertService.js
- createAlert(alertData)
- getAlertsByAddress(address)
- deleteAlert(alertId)
- checkAlerts() // Background monitoring
- evaluateAlert(alert)
- triggerAlert(alert)

// services/cacheService.js
- get(key)
- set(key, value, ttl)
- delete(key)
- has(key)
- clear()
```

## 🎯 Key Components Explained

### Server.js - The Heart
**Purpose:** Express application setup and configuration
**Key Features:**
- Middleware initialization
- Route mounting
- Error handling
- Server startup

### Controllers - Business Logic
**Purpose:** Handle HTTP requests and orchestrate services
**Pattern:** Request → Validate → Process → Respond
**Example Flow:**
```javascript
1. Receive request
2. Extract parameters
3. Call appropriate services
4. Aggregate results
5. Format response
6. Handle errors
```

### Services - Core Functionality
**Purpose:** Encapsulate business logic and external integrations

#### AuraService
- **Role:** AURA blockchain data provider
- **Caching:** Yes (5 min TTL)
- **Fallback:** Mock data in development

#### AIService
- **Role:** AI-powered analysis and predictions
- **Model:** GPT-4 Turbo / GPT-3.5
- **Rate Limits:** OpenAI limits apply
- **Fallback:** Rule-based analysis

#### RiskAnalyzer
- **Role:** Calculate portfolio risk scores
- **Algorithm:** Multi-factor risk model
- **Output:** 0-100 score + recommendations

#### AlertService
- **Role:** Monitor and trigger alerts
- **Monitoring:** 30-second intervals
- **Storage:** In-memory (production: database)

#### CacheService
- **Role:** Performance optimization
- **Type:** In-memory Map
- **TTL:** Configurable per key
- **Cleanup:** Auto-cleanup every 5 minutes

### Routes - API Endpoints
**Purpose:** Define HTTP endpoints and link to controllers

```javascript
// Wallet Routes (/api/wallet)
GET    /:address              → getWalletOverview
GET    /:address/tokens       → getTokenHoldings
GET    /:address/transactions → getTransactionHistory
POST   /:address/analyze      → analyzeWallet
GET    /:address/risk-score   → getRiskScore

// Analysis Routes (/api/analysis)
POST   /swap-timing           → predictSwapTiming
POST   /transaction-risk      → assessTransactionRisk
GET    /market-insights       → getMarketInsights
GET    /portfolio-health/:address → getPortfolioHealth

// Alert Routes (/api/alerts)
POST   /create                → createAlert
GET    /:address              → getAlerts
DELETE /:alertId              → deleteAlert
GET    /:address/active       → getActiveAlerts
```

### Middleware - Request Processing
**Purpose:** Process requests before reaching controllers

#### errorHandler.js
- Catches all errors
- Formats error responses
- Logs errors
- Hides sensitive info in production

#### validators.js
- Validates wallet addresses
- Validates swap parameters
- Sanitizes inputs
- Prevents injection attacks

#### logger.js
- Logs all requests
- Tracks response times
- Helps debugging
- Performance monitoring

## 📊 Risk Scoring Algorithm

### Multi-Factor Risk Model (0-100 scale)

```
Total Risk Score = Diversification Risk (25 pts)
                 + Volatility Risk (30 pts)
                 + Concentration Risk (25 pts)
                 + Liquidity Risk (20 pts)

Risk Levels:
- LOW (0-24):      Green light, healthy portfolio
- MEDIUM (25-49):  Yellow, some concerns
- HIGH (50-74):    Orange, significant risk
- CRITICAL (75+):  Red, immediate action needed
```

### Factor Breakdown

**1. Diversification Risk (0-25 points)**
- 1 token = 25 pts (maximum risk)
- 2 tokens = 20 pts
- 3-5 tokens = 12 pts
- 6-10 tokens = 5 pts
- 10+ tokens = 2 pts (well diversified)

**2. Volatility Risk (0-30 points)**
- Based on token type distribution
- Stablecoins: 5% weight
- Blue chips: 15% weight
- Altcoins: 30% weight
- Memecoins: 50% weight

**3. Concentration Risk (0-25 points)**
- Top 1 holding > 70% = 25 pts
- Top 1 holding > 50% = 20 pts
- Top 1 holding > 30% = 15 pts
- Top 3 holdings > 80% = 10 pts
- Well balanced = 3 pts

**4. Liquidity Risk (0-20 points)**
- Illiquid assets > 50% = 20 pts
- Illiquid assets > 25% = 15 pts
- Illiquid assets > 10% = 8 pts
- Good liquidity = 2 pts

## 🚀 Quick Start Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

### Testing Endpoints
```bash
# Test health check
curl http://localhost:3001/health

# Test wallet analysis
curl http://localhost:3001/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Test AI analysis (POST)
curl -X POST http://localhost:3001/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/analyze

# Test swap timing
curl -X POST http://localhost:3001/api/analysis/swap-timing \
  -H "Content-Type: application/json" \
  -d '{"fromToken":"AURA","toToken":"ETH","amount":1000}'

# Create price alert
curl -X POST http://localhost:3001/api/alerts/create \
  -H "Content-Type: application/json" \
  -d '{
    "address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "type":"PRICE",
    "condition":"ABOVE",
    "value":1.5,
    "token":"AURA"
  }'
```

## 🔐 Environment Variables Guide

### Required Variables
```bash
# Critical - App won't work without these
AURA_API_KEY=xxx           # Get from AURA dashboard
OPENAI_API_KEY=sk-xxx      # Get from OpenAI platform
```

### Optional Variables
```bash
# Server config (has defaults)
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# API endpoints (has defaults)
AURA_API_URL=https://api.aura.network

# AI config (has defaults)
OPENAI_MODEL=gpt-4-turbo-preview

# Performance tuning
CACHE_TTL_WALLET=300       # 5 minutes
CACHE_TTL_PRICE=60         # 1 minute
CACHE_TTL_MARKET=180       # 3 minutes

# Features (all enabled by default)
ENABLE_AI_ANALYSIS=true
ENABLE_RISK_ALERTS=true
ENABLE_SWAP_PREDICTIONS=true
```

## 📝 Adding New Features - Checklist

### To Add a New Endpoint:

1. **Create/Update Service** (if needed)
   ```javascript
   // services/newService.js
   export class NewService {
     async newMethod() { ... }
   }
   ```

2. **Create/Update Controller**
   ```javascript
   // controllers/newController.js
   export class NewController {
     newEndpoint = async (req, res, next) => { ... }
   }
   ```

3. **Add Route**
   ```javascript
   // routes/new.js
   router.get('/new-endpoint', controller.newEndpoint);
   ```

4. **Mount Route in server.js**
   ```javascript
   import newRoutes from './routes/new.js';
   app.use('/api/new', newRoutes);
   ```

5. **Update Documentation**
   - Add to README.md
   - Update this file
   - Add code comments

6. **Test**
   ```bash
   curl http://localhost:3001/api/new/new-endpoint
   ```

## 🎯 Next Steps for Production

### 1. Database Integration
- Replace in-memory storage with MongoDB/PostgreSQL
- Implement user authentication
- Store alert history
- Cache with Redis

### 2. WebSocket Support
- Real-time price updates
- Live alert notifications
- Portfolio changes stream

### 3. Advanced Features
- Historical portfolio tracking
- Performance analytics
- Tax reporting
- Multi-chain support

### 4. DevOps
- CI/CD pipeline
- Docker containers
- Kubernetes deployment
- Monitoring (Datadog/New Relic)

### 5. Security Enhancements
- JWT authentication
- API key management
- Rate limiting per user
- Input sanitization

---

## 📞 Need Help?

**Common Issues:**
- AURA API not responding → Check .env file
- OpenAI errors → Verify API key and credits
- Port already in use → Change PORT in .env
- CORS errors → Check FRONTEND_URL setting

**Resources:**
- AURA Docs: https://guide.adex.network/adex-aura-api/introduction
- OpenAI Docs: https://platform.openai.com/docs
- Express Docs: https://expressjs.com

---

**Built for AURA Network Hackathon** 🏆