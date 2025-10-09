const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { 
  authenticate, 
  validatePaymentIntent, 
  validatePaymentId,
  validateFareCalculation,
  asyncHandler 
} = require('../middleware');

// Fare estimation (public route)
router.post('/calculate-fare', validateFareCalculation, asyncHandler(PaymentController.calculateFareEstimate));

// Stripe webhook (public route with raw body parsing)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), asyncHandler(PaymentController.handleStripeWebhook));

// All routes below require authentication
router.use(authenticate);

// Payment operations
router.post('/create-intent', validatePaymentIntent, asyncHandler(PaymentController.createPaymentIntent));
router.post('/:paymentId/confirm', validatePaymentId, asyncHandler(PaymentController.confirmPayment));
router.get('/:paymentId', validatePaymentId, asyncHandler(PaymentController.getPayment));
router.post('/:paymentId/refund', validatePaymentId, asyncHandler(PaymentController.processRefund));

// Payment history
router.get('/history', asyncHandler(PaymentController.getPaymentHistory));

module.exports = router;