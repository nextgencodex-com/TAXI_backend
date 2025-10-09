const express = require('express');
const router = express.Router();
const {
  getAllVehicles,
  getAvailableVehicles,
  getVehiclesByPassengerCount,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateVehicleAvailability,
  searchVehicles
} = require('../controllers/vehicleController');

// Get all vehicles
router.get('/', getAllVehicles);

// Get available vehicles
router.get('/available', getAvailableVehicles);

// Search vehicles
router.get('/search', searchVehicles);

// Get vehicles by passenger count
router.get('/by-passengers', getVehiclesByPassengerCount);

// Get a specific vehicle
router.get('/:vehicleId', getVehicleById);

// Create a new vehicle
router.post('/', createVehicle);

// Update a vehicle
router.put('/:vehicleId', updateVehicle);

// Update vehicle availability
router.patch('/:vehicleId/availability', updateVehicleAvailability);

// Delete a vehicle
router.delete('/:vehicleId', deleteVehicle);

module.exports = router;