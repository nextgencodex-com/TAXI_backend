const { validationResult, body, param, query } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('firstName')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('role')
    .optional()
    .isIn(['passenger', 'driver'])
    .withMessage('Role must be either passenger or driver'),
  handleValidationErrors,
];

// Login validation
const validateLogin = [
  body('idToken')
    .notEmpty()
    .withMessage('Firebase ID token is required'),
  handleValidationErrors,
];

// Ride creation validation
const validateRideCreation = [
  body('pickupLocation.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid pickup latitude is required'),
  body('pickupLocation.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid pickup longitude is required'),
  body('destination.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid destination latitude is required'),
  body('destination.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid destination longitude is required'),
  body('rideType')
    .isIn(['standard', 'shared', 'premium', 'van'])
    .withMessage('Valid ride type is required'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'wallet'])
    .withMessage('Valid payment method is required'),
  body('passengers')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Number of passengers must be between 1 and 8'),
  body('scheduledTime')
    .optional()
    .isISO8601()
    .withMessage('Valid scheduled time is required'),
  handleValidationErrors,
];

// Location update validation
const validateLocationUpdate = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  handleValidationErrors,
];

// Rating validation
const validateRating = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('feedback')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Feedback must not exceed 500 characters'),
  handleValidationErrors,
];

// Payment intent validation
const validatePaymentIntent = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valid amount is required'),
  body('currency')
    .optional()
    .isIn(['usd', 'eur', 'gbp'])
    .withMessage('Valid currency is required'),
  body('rideId')
    .notEmpty()
    .withMessage('Ride ID is required'),
  handleValidationErrors,
];

// Vehicle info validation
const validateVehicleInfo = [
  body('make')
    .notEmpty()
    .trim()
    .withMessage('Vehicle make is required'),
  body('model')
    .notEmpty()
    .trim()
    .withMessage('Vehicle model is required'),
  body('year')
    .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
    .withMessage('Valid vehicle year is required'),
  body('color')
    .notEmpty()
    .trim()
    .withMessage('Vehicle color is required'),
  body('licensePlate')
    .notEmpty()
    .trim()
    .withMessage('License plate is required'),
  body('capacity')
    .isInt({ min: 1, max: 8 })
    .withMessage('Vehicle capacity must be between 1 and 8'),
  handleValidationErrors,
];

// ID parameter validation
const validateId = [
  param('id')
    .notEmpty()
    .withMessage('ID parameter is required'),
  handleValidationErrors,
];

// Ride ID parameter validation
const validateRideId = [
  param('rideId')
    .notEmpty()
    .withMessage('Ride ID parameter is required'),
  handleValidationErrors,
];

// Payment ID parameter validation
const validatePaymentId = [
  param('paymentId')
    .notEmpty()
    .withMessage('Payment ID parameter is required'),
  handleValidationErrors,
];

// Coordinates query validation
const validateCoordinatesQuery = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: 100 })
    .withMessage('Radius must be between 0.1 and 100 km'),
  handleValidationErrors,
];

// Phone verification validation
const validatePhoneVerification = [
  body('phoneNumber')
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors,
];

// Fare calculation validation
const validateFareCalculation = [
  body('distance')
    .isFloat({ min: 0.1 })
    .withMessage('Valid distance is required'),
  body('duration')
    .isFloat({ min: 1 })
    .withMessage('Valid duration is required'),
  body('rideType')
    .optional()
    .isIn(['standard', 'shared', 'premium', 'van'])
    .withMessage('Valid ride type is required'),
  handleValidationErrors,
];

module.exports = {
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
};