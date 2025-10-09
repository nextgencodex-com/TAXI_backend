const { User } = require('../models');

// Role-based authorization middleware
const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Get user from database to check current role
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated',
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      // Update req.user with current user data
      req.user.role = user.role;
      req.currentUser = user;
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
};

// Check if user is driver
const requireDriver = authorize('driver');

// Check if user is passenger
const requirePassenger = authorize('passenger');

// Check if user is admin
const requireAdmin = authorize('admin');

// Check if user is driver or admin
const requireDriverOrAdmin = authorize('driver', 'admin');

// Check if user is passenger or admin
const requirePassengerOrAdmin = authorize('passenger', 'admin');

// Check if driver is verified and online
const requireActiveDriver = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Driver role required',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Driver verification required',
      });
    }

    if (!user.documentsVerified) {
      return res.status(403).json({
        success: false,
        message: 'Driver documents verification required',
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Driver verification check failed',
    });
  }
};

module.exports = {
  authorize,
  requireDriver,
  requirePassenger,
  requireAdmin,
  requireDriverOrAdmin,
  requirePassengerOrAdmin,
  requireActiveDriver,
};