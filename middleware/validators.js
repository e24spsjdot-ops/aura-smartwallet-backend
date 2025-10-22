// middleware/validators.js - Input validation
export const validateWalletAddress = (req, res, next) => {
  const { address } = req.params;
  
  if (!address) {
    return res.status(400).json({
      error: 'Wallet address is required'
    });
  }

  // Basic validation - adjust regex based on AURA's address format
  const addressRegex = /^(0x)?[0-9a-fA-F]{40}$/;
  
  if (!addressRegex.test(address)) {
    return res.status(400).json({
      error: 'Invalid wallet address format'
    });
  }

  next();
};

export const validateSwapParams = (req, res, next) => {
  const { fromToken, toToken, amount } = req.body;
  
  if (!fromToken || !toToken || !amount) {
    return res.status(400).json({
      error: 'Missing required parameters: fromToken, toToken, amount'
    });
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      error: 'Amount must be a positive number'
    });
  }

  next();
};