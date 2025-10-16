const express = require('express');
const router = express.Router();
const personalRideController = require('../controllers/personalRideController');
const { authenticate, optionalAuthenticate, asyncHandler, validateRideId } = require('../middleware');
router.post('/', optionalAuthenticate, asyncHandler(personalRideController.createPersonalRide));

router.get('/', asyncHandler(personalRideController.getAllPersonalRides));

router.put('/:rideId', validateRideId, asyncHandler(personalRideController.updatePersonalRide));

router.delete('/:rideId', validateRideId, asyncHandler(personalRideController.deletePersonalRide));

module.exports = router;
