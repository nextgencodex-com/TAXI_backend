const AuthService = require('../utils/authService');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // First try to verify as JWT token
      const decoded = AuthService.verifyJwtToken(token);
      req.user = decoded;
      next();
    } catch (jwtError) {
      // If JWT fails, try Firebase ID token
      try {
        const firebaseUser = await AuthService.verifyIdToken(token);
        req.user = {
          userId: firebaseUser.uid,
          email: firebaseUser.email,
          role: firebaseUser.role || 'passenger',
        };
        next();
      } catch (firebaseError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

// Optional authentication (for public endpoints that can work with or without auth)
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.substring(7);
    
    try {
      const decoded = AuthService.verifyJwtToken(token);
      req.user = decoded;
    } catch (jwtError) {
      try {
        const firebaseUser = await AuthService.verifyIdToken(token);
        req.user = {
          userId: firebaseUser.uid,
          email: firebaseUser.email,
          role: firebaseUser.role || 'passenger',
        };
      } catch (firebaseError) {
        req.user = null;
      }
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
};