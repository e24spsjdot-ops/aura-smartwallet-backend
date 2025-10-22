# 🚀 AURA SmartWallet AI - Backend

AI-powered crypto wallet assistant that predicts optimal swap timing and alerts users about risky transactions.

## 🏗️ Architecture Overview

```
├── server.js                 # Main Express server
├── controllers/              # Business logic layer
│   ├── walletController.js
│   ├── analysisController.js
│   └── alertController.js
├── services/                 # Core services
│   ├── auraService.js       # AURA API integration
│   ├── aiService.js         # OpenAI integration
│   ├── riskAnalyzer.js      # Risk calculation engine
│   ├── alertService.js      # Alert monitoring
│   └── cacheService.js      # In-memory caching
├── routes/                   # API routes
│   ├── wallet.js
│   ├── analysis.js
│   └── alerts.js
└── middleware/               # Express middleware
    ├── errorHandler.js
    ├── validators.js
    └── logger.js
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

**Required API Keys:**
- `AURA_API_KEY` - Get from [AURA Network](https://aura.network)
- `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com)

### 3. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

### 4. Test the API

```bash
# Health check
curl http://localhost:3001/health

# Get wallet overview
curl http://localhost:3001/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## 📡 API Endpoints

### Wallet Endpoints

#### Get Wallet Overview
```http
GET /api/wallet/:address
```

**Response:**
```json
{
  "address": "0x...",
  "totalValue": 5250.75,
  "tokenCount": 4,
  "tokens": [...],
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

#### Get Token Holdings
```http
GET /api/wallet/:address/tokens
```

#### Get Transaction History
```http
GET /api/wallet/:address/transactions?limit=20&offset=0
```

#### Analyze Wallet (AI-powered)
```http
POST /api/wallet/:address/analyze
```

**Response:**
```json
{
  "address": "0x...",
  "riskScore": {
    "score": 35,
    "level": "MEDIUM",
    "factors": {...}
  },
  "aiInsights": {
    "summary": "Your portfolio shows moderate diversification...",
    "keyInsights": [...],
    "confidence": 85
  },
  "recommendations": [...]
}
```

### Analysis Endpoints

#### Predict Swap Timing
```http
POST /api/analysis/swap-timing
Content-Type: application/json

{
  "fromToken": "AURA",
  "toToken": "ETH",
  "amount": 1000
}
```

**Response:**
```json
{
  "prediction": {
    "timing": "Wait 1-3 hours",
    "confidence": 75,
    "reasoning": "Gas fees are currently high...",
    "potentialSavings": 3.2
  }
}
```

#### Assess Transaction Risk
```http
POST /api/analysis/transaction-risk
Content-Type: application/json

{
  "to": "0x...",
  "value": 100,
  "contractAddress": "0x...",
  "gasUsed": 450000
}
```

**Response:**
```json
{
  "risk": {
    "level": "HIGH",
    "score": 65,
    "warnings": ["Unusually high gas usage", "Unknown contract"]
  },
  "recommendation": {
    "action": "REVIEW",
    "message": "Carefully review before proceeding"
  }
}
```

#### Get Market Insights
```http
GET /api/analysis/market-insights
```

#### Get Portfolio Health
```http
GET /api/analysis/portfolio-health/:address
```

### Alert Endpoints

#### Create Alert
```http
POST /api/alerts/create
Content-Type: application/json

{
  "address": "0x...",
  "type": "PRICE",
  "condition": "ABOVE",
  "value": 1.5,
  "token": "AURA"
}
```

**Alert Types:**
- `PRICE` - Price alerts (ABOVE, BELOW, CHANGE_UP, CHANGE_DOWN)
- `RISK` - Risk level alerts (EXCEEDS, BELOW, LEVEL)
- `BALANCE` - Balance alerts (ABOVE, BELOW)
- `TRANSACTION` - Risky transaction detection

#### Get Alerts
```http
GET /api/alerts/:address
```

#### Get Active Alerts
```http
GET /api/alerts/:address/active
```

#### Delete Alert
```http
DELETE /api/alerts/:alertId
```

## 🧠 AI Features

### 1. Portfolio Analysis
- Comprehensive risk assessment
- Diversification analysis
- AI-generated insights and recommendations
- Natural language summaries

### 2. Swap Timing Predictions
- Market condition analysis
- Gas fee optimization
- Historical pattern recognition
- Confidence scoring

### 3. Transaction Risk Detection
- Real-time risk assessment
- Honeypot detection
- Suspicious pattern identification
- Automated warnings

### 4. Smart Alerts
- Price monitoring
- Risk threshold alerts
- Balance tracking
- Transaction risk notifications

## 🔒 Security Features

- Rate limiting (100 requests per 15 minutes)
- Input validation on all endpoints
- Helmet.js security headers
- CORS configuration
- Error handling without leaking sensitive data

## 🚀 Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard

### Docker Deployment

```bash
docker build -t aura-smartwallet .
docker run -p 3001:3001 --env-file .env aura-smartwallet
```

## 📊 Performance

- **Response Time:** < 500ms (cached)
- **AI Analysis:** 2-5 seconds
- **Alert Checks:** Every 30 seconds
- **Cache TTL:** 5 minutes (configurable)

## 🧪 Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage
```

## 🐛 Troubleshooting

### AURA API Connection Issues
- Verify API key in `.env`
- Check API endpoint URL
- Review network/firewall settings

### OpenAI Rate Limits
- Implement request queuing
- Use GPT-3.5-turbo for non-critical requests
- Monitor usage in OpenAI dashboard

### High Memory Usage
- Adjust cache TTL values
- Implement Redis for production
- Clear expired alerts regularly

## 📝 Development Notes

### Mock Data Mode
When `NODE_ENV=development`, the backend uses mock data if AURA API is unavailable. This allows frontend development without API access.

### Adding New Features
1. Create service in `services/`
2. Add controller in `controllers/`
3. Define routes in `routes/`
4. Update this README

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/ye24spsjdot-ops/aura-smartwallet-backend/issues)
- **Discord:** Join AURA Network Discord
- **Email:** e24sps.jdot@gmail.com

---

Built with ❤️ for AURA Network Hackathon