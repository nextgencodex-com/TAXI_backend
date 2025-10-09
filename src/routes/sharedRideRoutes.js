const express = require('express');
const router = express.Router();
const {
  getAllSharedRides,
  getSharedRidesByLocation,
  getSharedRideById,
  createSharedRide,
  updateSharedRide,
  deleteSharedRide,
  bookSharedRideSeat
} = require('../controllers/sharedRideController');

// Get all shared rides
router.get('/', getAllSharedRides);

// Search shared rides by location
router.get('/search', getSharedRidesByLocation);

// Get a specific shared ride
router.get('/:rideId', getSharedRideById);

// Create a new shared ride
router.post('/', createSharedRide);

// Update a shared ride
router.put('/:rideId', updateSharedRide);

// Delete a shared ride
router.delete('/:rideId', deleteSharedRide);

// Book a seat in shared ride
router.post('/:rideId/book', bookSharedRideSeat);

module.exports = router;