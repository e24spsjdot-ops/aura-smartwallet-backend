#!/bin/bash

BASE="http://localhost:3001"
WALLET="0x48Bdaa967c99f5f81430E94064B27a4917055f35"

echo "🧪 Testing All Endpoints..."
echo ""

echo "1️⃣ Health Check..."
curl -s "$BASE/health" | jq -r '.status'
echo ""

echo "2️⃣ Wallet Overview..."
curl -s "$BASE/api/wallet/$WALLET" | jq -r '.summary.totalValue'
echo ""

echo "3️⃣ Complete Analysis (this takes ~10 seconds)..."
curl -s -X POST "$BASE/api/wallet/$WALLET/analyze" | jq -r '.aiEnhancement.summary'
echo ""

echo "4️⃣ Market Insights..."
curl -s "$BASE/api/analysis/market-insights" | jq -r '.aiContext.sentiment'
echo ""

echo "5️⃣ Portfolio Health..."
curl -s "$BASE/api/analysis/portfolio-health/$WALLET" | jq -r '.healthLevel'
echo ""

echo "✅ All tests complete!"
