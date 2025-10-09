const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { 
  authenticate, 
  requireDriver, 
  uploadSingle,
  validateLocationUpdate, 
  validateVehicleInfo,
  validateCoordinatesQuery,
  asyncHandler 
} = require('../middleware');

// All routes require authentication
router.use(authenticate);

// General user routes
router.get('/profile', asyncHandler(UserController.getProfile));
router.put('/profile', asyncHandler(UserController.updateProfile));
router.get('/stats', asyncHandler(UserController.getUserStats));
router.post('/deactivate', asyncHandler(UserController.deactivateAccount));
router.post('/reactivate', asyncHandler(UserController.reactivateAccount));

// Profile picture upload
router.post('/profile-picture', uploadSingle('profilePicture'), asyncHandler(UserController.uploadProfilePicture));

// Driver-specific routes
router.put('/location', requireDriver, validateLocationUpdate, asyncHandler(UserController.updateLocation));
router.put('/online-status', requireDriver, asyncHandler(UserController.updateOnlineStatus));
router.put('/vehicle', requireDriver, validateVehicleInfo, asyncHandler(UserController.updateVehicleInfo));

// Public routes (for passengers to find drivers)
router.get('/nearby-drivers', validateCoordinatesQuery, asyncHandler(UserController.getNearbyDrivers));

module.exports = router;