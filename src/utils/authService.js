const { auth } = require('../config/firebase');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config');

class AuthService {
  // Verify Firebase ID token
  static async verifyIdToken(idToken) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  // Create custom JWT token
  static createJwtToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  // Verify JWT token
  static verifyJwtToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error(`Invalid JWT token: ${error.message}`);
    }
  }

  // Register new user
  static async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Check phone number if provided
      if (userData.phoneNumber) {
        const existingPhone = await User.findByPhoneNumber(userData.phoneNumber);
        if (existingPhone) {
          throw new Error('User already exists with this phone number');
        }
      }

      // Create Firebase user
      const firebaseUser = await auth.createUser({
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        displayName: `${userData.firstName} ${userData.lastName}`,
        disabled: false,
      });

      // Create user in Firestore
      const user = await User.create({
        ...userData,
        id: firebaseUser.uid,
        isVerified: false,
        isActive: true,
      });

      // Generate custom token
      const customToken = await auth.createCustomToken(firebaseUser.uid);

      return {
        user,
        customToken,
        firebaseUser: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        },
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  // Login user
  static async login(idToken) {
    try {
      // Verify Firebase ID token
      const decodedToken = await this.verifyIdToken(idToken);
      
      // Get user from database
      const user = await User.findById(decodedToken.uid);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Generate JWT token
      const jwtToken = this.createJwtToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user,
        token: jwtToken,
        firebase: decodedToken,
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Refresh token
  static async refreshToken(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Generate new JWT token
      const jwtToken = this.createJwtToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user,
        token: jwtToken,
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update Firebase user if email or phone changed
      if (updateData.email || updateData.phoneNumber) {
        const firebaseUpdateData = {};
        if (updateData.email) firebaseUpdateData.email = updateData.email;
        if (updateData.phoneNumber) firebaseUpdateData.phoneNumber = updateData.phoneNumber;
        
        await auth.updateUser(userId, firebaseUpdateData);
      }

      // Update user in Firestore
      const updatedUser = await user.update(updateData);

      return updatedUser;
    } catch (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  // Delete user account
  static async deleteAccount(userId) {
    try {
      // Delete from Firebase Auth
      await auth.deleteUser(userId);

      // Delete from Firestore
      const user = await User.findById(userId);
      if (user) {
        await user.delete();
      }

      return true;
    } catch (error) {
      throw new Error(`Account deletion failed: ${error.message}`);
    }
  }

  // Verify phone number
  static async verifyPhoneNumber(userId, phoneNumber) {
    try {
      // Update user's phone verification status
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update Firebase user
      await auth.updateUser(userId, {
        phoneNumber: phoneNumber,
      });

      // Update user in Firestore
      await user.update({
        phoneNumber: phoneNumber,
        isVerified: true,
      });

      return true;
    } catch (error) {
      throw new Error(`Phone verification failed: ${error.message}`);
    }
  }

  // Set custom claims for role-based access
  static async setCustomClaims(userId, claims) {
    try {
      await auth.setCustomUserClaims(userId, claims);
      return true;
    } catch (error) {
      throw new Error(`Setting custom claims failed: ${error.message}`);
    }
  }

  // Get user by email
  static async getUserByEmail(email) {
    try {
      const firebaseUser = await auth.getUserByEmail(email);
      const user = await User.findById(firebaseUser.uid);
      
      return {
        firebaseUser,
        user,
      };
    } catch (error) {
      throw new Error(`Get user by email failed: ${error.message}`);
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(email) {
    try {
      // Firebase handles password reset emails automatically
      // when user clicks "Forgot Password" in your frontend
      
      // You can generate a custom password reset link if needed
      const resetLink = await auth.generatePasswordResetLink(email);
      
      return {
        success: true,
        resetLink,
        message: 'Password reset email sent successfully',
      };
    } catch (error) {
      throw new Error(`Send password reset email failed: ${error.message}`);
    }
  }

  // Disable user account
  static async disableUser(userId) {
    try {
      await auth.updateUser(userId, {
        disabled: true,
      });

      const user = await User.findById(userId);
      if (user) {
        await user.update({ isActive: false });
      }

      return true;
    } catch (error) {
      throw new Error(`Disable user failed: ${error.message}`);
    }
  }

  // Enable user account
  static async enableUser(userId) {
    try {
      await auth.updateUser(userId, {
        disabled: false,
      });

      const user = await User.findById(userId);
      if (user) {
        await user.update({ isActive: true });
      }

      return true;
    } catch (error) {
      throw new Error(`Enable user failed: ${error.message}`);
    }
  }
}

module.exports = AuthService;