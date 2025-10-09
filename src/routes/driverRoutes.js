const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/driverController');
const { db } = require('../config/firebase');

// Driver routes
router.post('/drivers', DriverController.registerDriver);
router.get('/drivers', DriverController.getAllDrivers);
router.get('/drivers/nearby', DriverController.getNearbyDrivers);
router.get('/drivers/:driverId', DriverController.getDriver);
router.put('/drivers/:driverId/location', DriverController.updateLocation);
router.put('/drivers/:driverId/status', DriverController.updateOnlineStatus);
router.put('/drivers/:driverId/vehicle', DriverController.updateVehicleInfo);

module.exports = router;