const { User } = require('../models');
const { db } = require('../config/firebase');

class DriverController {
  // Register a new driver
  static async registerDriver(req, res) {
    try {
      const {
        name,
        phoneNumber,
        vehicleInfo,
      } = req.body;

      // Validate required fields
      if (!name || !phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Name and phone number are required',
        });
      }

      // Check if driver already exists
      const existingDriver = await User.findByPhoneNumber(phoneNumber);
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: 'Driver already exists with this phone number',
        });
      }

      // Create driver
      const driver = await User.create({
        name,
        phoneNumber,
        role: 'driver',
        vehicleInfo: vehicleInfo || {},
        isOnline: false,
      });

      res.status(201).json({
        success: true,
        message: 'Driver registered successfully',
        data: { driver },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get all drivers
  static async getAllDrivers(req, res) {
    try {
      const { isOnline, limit = 20 } = req.query;
      
      let query = db.collection('users').where('role', '==', 'driver');
      
      if (isOnline !== undefined) {
        query = query.where('isOnline', '==', isOnline === 'true');
      }
      
      const snapshot = await query.limit(parseInt(limit)).get();
      
      const drivers = [];
      snapshot.forEach(doc => {
        drivers.push(new User({ id: doc.id, ...doc.data() }));
      });

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

  // Get driver by ID
  static async getDriver(req, res) {
    try {
      const { driverId } = req.params;

      const driver = await User.findById(driverId);
      if (!driver || driver.role !== 'driver') {
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      res.json({
        success: true,
        data: { driver },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update driver location
  static async updateLocation(req, res) {
    try {
      const { driverId } = req.params;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const driver = await User.findById(driverId);
      if (!driver || driver.role !== 'driver') {
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      const updatedDriver = await driver.update({
        currentLocation: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Location updated successfully',
        data: { driver: updatedDriver },
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
      const { driverId } = req.params;
      const { isOnline } = req.body;

      const driver = await User.findById(driverId);
      if (!driver || driver.role !== 'driver') {
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      const updatedDriver = await driver.update({ isOnline });

      res.json({
        success: true,
        message: `Driver is now ${isOnline ? 'online' : 'offline'}`,
        data: { driver: updatedDriver },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get nearby drivers
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

  // Update vehicle info
  static async updateVehicleInfo(req, res) {
    try {
      const { driverId } = req.params;
      const vehicleInfo = req.body;

      const driver = await User.findById(driverId);
      if (!driver || driver.role !== 'driver') {
        return res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
      }

      const updatedDriver = await driver.update({ vehicleInfo });

      res.json({
        success: true,
        message: 'Vehicle information updated successfully',
        data: { driver: updatedDriver },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = DriverController;