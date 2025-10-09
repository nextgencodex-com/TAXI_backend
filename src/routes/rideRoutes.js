const express = require('express');
const router = express.Router();
const RideController = require('../controllers/rideController');
const { 
  authenticate, 
  requireDriver, 
  requireActiveDriver,
  validateRideCreation, 
  validateRideId, 
  validateRating,
  validateCoordinatesQuery,
  asyncHandler 
} = require('../middleware');

// All routes require authentication
router.use(authenticate);

// Passenger routes
router.post('/', validateRideCreation, asyncHandler(RideController.createRide));
router.get('/shared', validateCoordinatesQuery, asyncHandler(RideController.findSharedRides));
router.post('/:rideId/join', validateRideId, asyncHandler(RideController.joinSharedRide));
router.post('/:rideId/cancel', validateRideId, asyncHandler(RideController.cancelRide));
router.post('/:rideId/rate', validateRideId, validateRating, asyncHandler(RideController.rateRide));

// Driver routes
router.get('/pending', requireDriver, asyncHandler(RideController.getPendingRides));
router.post('/:rideId/accept', requireActiveDriver, validateRideId, asyncHandler(RideController.acceptRide));
router.post('/:rideId/start', requireDriver, validateRideId, asyncHandler(RideController.startRide));
router.post('/:rideId/complete', requireDriver, validateRideId, asyncHandler(RideController.completeRide));

// Common routes
router.get('/history', asyncHandler(RideController.getUserRides));
router.get('/:rideId', validateRideId, asyncHandler(RideController.getRide));

module.exports = router;