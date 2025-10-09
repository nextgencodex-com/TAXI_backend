const AuthService = require('../utils/authService');
const { User } = require('../models');

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const { email, phoneNumber, firstName, lastName, role = 'passenger' } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Email, first name, and last name are required',
        });
      }

      // Additional validation for driver role
      if (role === 'driver' && !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required for drivers',
        });
      }

      const result = await AuthService.register({
        email,
        phoneNumber,
        firstName,
        lastName,
        role,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          customToken: result.customToken,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'Firebase ID token is required',
        });
      }

      const result = await AuthService.login(idToken);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const userId = req.user.userId;

      const result = await AuthService.refreshToken(userId);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          token: result.token,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get current user profile
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

      const updatedUser = await AuthService.updateProfile(userId, updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Delete user account
  static async deleteAccount(req, res) {
    try {
      const userId = req.user.userId;

      await AuthService.deleteAccount(userId);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Verify phone number
  static async verifyPhone(req, res) {
    try {
      const userId = req.user.userId;
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
        });
      }

      await AuthService.verifyPhoneNumber(userId, phoneNumber);

      res.json({
        success: true,
        message: 'Phone number verified successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Send password reset email
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      const result = await AuthService.sendPasswordResetEmail(email);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Logout user (client-side mainly, but can be used for cleanup)
  static async logout(req, res) {
    try {
      // In Firebase, logout is mainly client-side
      // You can add any server-side cleanup here if needed
      
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = AuthController;