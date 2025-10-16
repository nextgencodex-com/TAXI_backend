const express = require('express');
const router = express.Router();
const privateRideController = require('../controllers/privateRideController');
const { authenticate, optionalAuthenticate, asyncHandler, validateRideId } = require('../middleware');

// Create private ride - allow optional authentication so public clients can create bookings
router.post('/', optionalAuthenticate, asyncHandler(privateRideController.createPrivateRide));

// Get all private rides (no authentication)
router.get('/', asyncHandler(privateRideController.getAllPrivateRides));

// Update a private ride (no authentication)
router.put('/:rideId', validateRideId, asyncHandler(privateRideController.updatePrivateRide));

// Delete a private ride (no authentication)
router.delete('/:rideId', validateRideId, asyncHandler(privateRideController.deletePrivateRide));

module.exports = router;
