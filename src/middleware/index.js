// Export all middleware
const { authenticate, optionalAuthenticate } = require('./auth');
const { 
  authorize, 
  requireDriver, 
  requirePassenger, 
  requireAdmin, 
  requireDriverOrAdmin, 
  requirePassengerOrAdmin, 
  requireActiveDriver 
} = require('./authorization');
const { 
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateRideCreation,
  validateLocationUpdate,
  validateRating,
  validatePaymentIntent,
  validateVehicleInfo,
  validateId,
  validateRideId,
  validatePaymentId,
  validateCoordinatesQuery,
  validatePhoneVerification,
  validateFareCalculation,
} = require('./validation');
const { 
  upload, 
  uploadSingle, 
  uploadMultiple, 
  uploadFields, 
  handleMulterError 
} = require('./upload');
const { errorHandler, notFound, asyncHandler } = require('./errorHandler');

module.exports = {
  // Authentication
  authenticate,
  optionalAuthenticate,
  
  // Authorization
  authorize,
  requireDriver,
  requirePassenger,
  requireAdmin,
  requireDriverOrAdmin,
  requirePassengerOrAdmin,
  requireActiveDriver,
  
  // Validation
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateRideCreation,
  validateLocationUpdate,
  validateRating,
  validatePaymentIntent,
  validateVehicleInfo,
  validateId,
  validateRideId,
  validatePaymentId,
  validateCoordinatesQuery,
  validatePhoneVerification,
  validateFareCalculation,
  
  // File upload
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
  
  // Error handling
  errorHandler,
  notFound,
  asyncHandler,
};