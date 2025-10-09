const { User } = require('../models');

class UserController {
  // Get user profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.role;
      delete updateData.isVerified;
      delete updateData.createdAt;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const updatedUser = await user.update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update driver location (for drivers only)
  static async updateLocation(req, res) {
    try {
      const userId = req.user.userId;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (user.role !== 'driver') {
        return res.status(403).json({
          success: false,
          message: 'Only drivers can update location',
        });
      }

      const updatedUser = await user.update({
        currentLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Location updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update driver online status
  static async updateOnlineStatus(req, res) {
    try {
      const userId = req.user.userId;
      const { isOnline } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (user.role !== 'driver') {
        return res.status(403).json({
          success: false,
          message: 'Only drivers can update online status',
        });
      }

      const updatedUser = await user.update({ isOnline });

      res.json({
        success: true,
        message: `Driver is now ${isOnline ? 'online' : 'offline'}`,
        data: { user: updatedUser },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get nearby drivers (for passengers)
  static async getNearbyDrivers(req, res) {
    try {
      const { lat, lng, radius = 10 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const location = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      };

      const drivers = await User.findNearbyDrivers(location, parseFloat(radius));

      res.json({
        success: true,
        data: { drivers },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Upload profile picture
  static async uploadProfilePicture(req, res) {
    try {
      const userId = req.user.userId;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      // Here you would typically upload to Cloudinary or similar service
      // For now, we'll just store the file path
      const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const updatedUser = await user.update({
        profilePicture: profilePictureUrl,
      });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update driver vehicle info
  static async updateVehicleInfo(req, res) {
    try {
      const userId = req.user.userId;
      const vehicleInfo = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (user.role !== 'driver') {
        return res.status(403).json({
          success: false,
          message: 'Only drivers can update vehicle information',
        });
      }

      const updatedUser = await user.update({ vehicleInfo });

      res.json({
        success: true,
        message: 'Vehicle information updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get user statistics
  static async getUserStats(req, res) {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const stats = {
        totalRides: user.totalRides || 0,
        rating: user.rating || 0,
        memberSince: user.createdAt,
        isVerified: user.isVerified,
        isActive: user.isActive,
      };

      if (user.role === 'driver') {
        stats.isOnline = user.isOnline;
        stats.documentsVerified = user.documentsVerified;
        stats.vehicleInfo = user.vehicleInfo;
      }

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Deactivate account
  static async deactivateAccount(req, res) {
    try {
      const userId = req.user.userId;
      const { reason } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      await user.update({
        isActive: false,
        deactivationReason: reason,
        deactivatedAt: new Date(),
      });

      res.json({
        success: true,
        message: 'Account deactivated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Reactivate account
  static async reactivateAccount(req, res) {
    try {
      const userId = req.user.userId;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      await user.update({
        isActive: true,
        deactivationReason: null,
        deactivatedAt: null,
        reactivatedAt: new Date(),
      });

      res.json({
        success: true,
        message: 'Account reactivated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = UserController;