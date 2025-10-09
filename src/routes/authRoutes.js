const express = require('express');
const router = express.Router();
const RideController = require('../controllers/rideController');

// Ride routes
router.post('/rides', RideController.createRide);
router.get('/rides', RideController.getAllRides);
router.get('/rides/pending', RideController.getPendingRides);
router.get('/rides/shared', RideController.findSharedRides);
router.get('/rides/:rideId', RideController.getRide);
router.post('/rides/:rideId/accept', RideController.acceptRide);
router.post('/rides/:rideId/start', RideController.startRide);
router.post('/rides/:rideId/complete', RideController.completeRide);
router.post('/rides/:rideId/cancel', RideController.cancelRide);
router.post('/rides/:rideId/rate', RideController.rateRide);
router.post('/rides/:rideId/join', RideController.joinSharedRide);

module.exports = router;