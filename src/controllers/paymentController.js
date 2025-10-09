const { Payment } = require('../models');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentController {
  // Create payment intent for Stripe
  static async createPaymentIntent(req, res) {
    try {
      const { amount, currency = 'usd', rideId, metadata = {} } = req.body;
      const userId = req.user.userId;

      if (!amount || !rideId) {
        return res.status(400).json({
          success: false,
          message: 'Amount and ride ID are required',
        });
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe expects amount in cents
        currency,
        metadata: {
          rideId,
          passengerId: userId,
          ...metadata,
        },
      });

      // Create payment record in database
      const payment = await Payment.create({
        rideId,
        passengerId: userId,
        amount,
        currency,
        method: 'card',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentId: payment.id,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Confirm payment
  static async confirmPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { transactionId } = req.body;

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      await payment.markCompleted(transactionId);

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: { payment },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get payment details
  static async getPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user.userId;

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      // Check if user is authorized to view this payment
      if (payment.passengerId !== userId && payment.driverId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this payment',
        });
      }

      res.json({
        success: true,
        data: { payment },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get user's payment history
  static async getPaymentHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10, role } = req.query;

      let payments;
      if (role === 'driver') {
        payments = await Payment.findByDriverId(userId, parseInt(limit));
      } else {
        payments = await Payment.findByPassengerId(userId, parseInt(limit));
      }

      res.json({
        success: true,
        data: { payments },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Process refund
  static async processRefund(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      if (payment.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Only completed payments can be refunded',
        });
      }

      // Process refund with Stripe if it was a card payment
      if (payment.method === 'card' && payment.stripePaymentIntentId) {
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason: 'requested_by_customer',
        });

        await payment.processRefund(amount || payment.amount, reason);
      } else {
        // For cash payments, just update the record
        await payment.processRefund(amount || payment.amount, reason);
      }

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: { payment },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Stripe webhook handler
  static async handleStripeWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: `Webhook signature verification failed: ${err.message}`,
        });
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          const payment = await Payment.findByStripePaymentIntentId(paymentIntent.id);
          if (payment) {
            await payment.markCompleted(paymentIntent.id);
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          const failedPaymentRecord = await Payment.findByStripePaymentIntentId(failedPayment.id);
          if (failedPaymentRecord) {
            await failedPaymentRecord.markFailed('Payment failed');
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Calculate fare estimate
  static async calculateFareEstimate(req, res) {
    try {
      const { distance, duration, rideType = 'standard' } = req.body;

      if (!distance || !duration) {
        return res.status(400).json({
          success: false,
          message: 'Distance and duration are required',
        });
      }

      // Basic fare calculation (you can customize this logic)
      const baseFare = 2.50;
      const perKmRate = rideType === 'premium' ? 2.00 : rideType === 'shared' ? 0.80 : 1.20;
      const perMinuteRate = 0.15;

      const distanceFare = distance * perKmRate;
      const timeFare = duration * perMinuteRate;
      const subtotal = baseFare + distanceFare + timeFare;

      // Apply surge pricing if needed (you can implement this logic)
      const surgeFactor = 1.0; // Normal pricing
      const fareBeforeTax = subtotal * surgeFactor;

      // Calculate tax and fees
      const tax = fareBeforeTax * 0.08; // 8% tax
      const serviceFee = 1.00;
      const totalFare = fareBeforeTax + tax + serviceFee;

      const fareBreakdown = {
        baseFare,
        distanceFare: parseFloat(distanceFare.toFixed(2)),
        timeFare: parseFloat(timeFare.toFixed(2)),
        subtotal: parseFloat(subtotal.toFixed(2)),
        surgeFactor,
        fareBeforeTax: parseFloat(fareBeforeTax.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        serviceFee,
        totalFare: parseFloat(totalFare.toFixed(2)),
      };

      res.json({
        success: true,
        data: { fareBreakdown },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = PaymentController;