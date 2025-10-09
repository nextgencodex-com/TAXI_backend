// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // Firebase Auth errors
  if (err.code && err.code.includes('auth/')) {
    let message = 'Authentication error';
    
    switch (err.code) {
      case 'auth/user-not-found':
        message = 'User not found';
        break;
      case 'auth/wrong-password':
        message = 'Invalid credentials';
        break;
      case 'auth/email-already-in-use':
        message = 'Email is already registered';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later';
        break;
      case 'auth/id-token-expired':
        message = 'Token has expired';
        break;
      case 'auth/id-token-revoked':
        message = 'Token has been revoked';
        break;
      default:
        message = err.message || 'Authentication error';
    }
    
    return res.status(401).json({
      success: false,
      message: message,
    });
  }

  // Firestore errors
  if (err.code && err.code.includes('firestore/')) {
    return res.status(500).json({
      success: false,
      message: 'Database operation failed',
    });
  }

  // Stripe errors
  if (err.type && err.type.includes('Stripe')) {
    let message = 'Payment processing error';
    let statusCode = 400;
    
    switch (err.type) {
      case 'StripeCardError':
        message = err.message || 'Card was declined';
        break;
      case 'StripeRateLimitError':
        message = 'Too many requests. Please try again later';
        statusCode = 429;
        break;
      case 'StripeInvalidRequestError':
        message = 'Invalid payment request';
        break;
      case 'StripeAPIError':
        message = 'Payment service temporarily unavailable';
        statusCode = 503;
        break;
      case 'StripeConnectionError':
        message = 'Network error. Please try again';
        statusCode = 503;
        break;
      case 'StripeAuthenticationError':
        message = 'Payment authentication failed';
        statusCode = 401;
        break;
      default:
        message = err.message || 'Payment processing error';
    }
    
    return res.status(statusCode).json({
      success: false,
      message: message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message: message,
    });
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    return res.status(400).json({
      success: false,
      message: message,
    });
  }

  // Cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // Default server error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Not found middleware
const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
};