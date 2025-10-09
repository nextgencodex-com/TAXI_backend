const { db } = require('../config/firebase');

class Payment {
  constructor(data) {
    this.id = data.id;
    this.rideId = data.rideId;
    this.bookingId = data.bookingId;
    this.passengerId = data.passengerId;
    this.driverId = data.driverId;
    this.amount = data.amount;
    this.currency = data.currency || 'USD';
    this.method = data.method; // 'card', 'cash', 'wallet', 'bank_transfer'
    this.status = data.status || 'pending'; // pending, completed, failed, refunded
    this.transactionId = data.transactionId || null;
    this.stripePaymentIntentId = data.stripePaymentIntentId || null;
    this.breakdown = data.breakdown || {};
    this.fees = data.fees || {};
    this.refundAmount = data.refundAmount || 0;
    this.refundReason = data.refundReason || null;
    this.processingFee = data.processingFee || 0;
    this.tip = data.tip || 0;
    this.discount = data.discount || 0;
    this.promoCode = data.promoCode || null;
    this.failureReason = data.failureReason || null;
    this.paidAt = data.paidAt || null;
    this.refundedAt = data.refundedAt || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new payment
  static async create(paymentData) {
    try {
      const paymentRef = db.collection('payments').doc();
      const payment = new Payment({ ...paymentData, id: paymentRef.id });
      await paymentRef.set(payment.toFirestore());
      return payment;
    } catch (error) {
      throw new Error(`Error creating payment: ${error.message}`);
    }
  }

  // Find payment by ID
  static async findById(id) {
    try {
      const doc = await db.collection('payments').doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return new Payment({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding payment: ${error.message}`);
    }
  }

  // Find payment by ride ID
  static async findByRideId(rideId) {
    try {
      const snapshot = await db.collection('payments')
        .where('rideId', '==', rideId)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return new Payment({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding payment by ride ID: ${error.message}`);
    }
  }

  // Find payment by Stripe payment intent ID
  static async findByStripePaymentIntentId(paymentIntentId) {
    try {
      const snapshot = await db.collection('payments')
        .where('stripePaymentIntentId', '==', paymentIntentId)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return new Payment({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding payment by Stripe payment intent ID: ${error.message}`);
    }
  }

  // Find payments by passenger ID
  static async findByPassengerId(passengerId, limit = 10) {
    try {
      const snapshot = await db.collection('payments')
        .where('passengerId', '==', passengerId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const payments = [];
      snapshot.forEach(doc => {
        payments.push(new Payment({ id: doc.id, ...doc.data() }));
      });
      return payments;
    } catch (error) {
      throw new Error(`Error finding payments by passenger: ${error.message}`);
    }
  }

  // Find payments by driver ID
  static async findByDriverId(driverId, limit = 10) {
    try {
      const snapshot = await db.collection('payments')
        .where('driverId', '==', driverId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const payments = [];
      snapshot.forEach(doc => {
        payments.push(new Payment({ id: doc.id, ...doc.data() }));
      });
      return payments;
    } catch (error) {
      throw new Error(`Error finding payments by driver: ${error.message}`);
    }
  }

  // Update payment
  async update(updateData) {
    try {
      updateData.updatedAt = new Date();
      await db.collection('payments').doc(this.id).update(updateData);
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating payment: ${error.message}`);
    }
  }

  // Mark payment as completed
  async markCompleted(transactionId = null) {
    try {
      const updateData = {
        status: 'completed',
        paidAt: new Date()
      };
      
      if (transactionId) {
        updateData.transactionId = transactionId;
      }

      await this.update(updateData);
      return this;
    } catch (error) {
      throw new Error(`Error marking payment as completed: ${error.message}`);
    }
  }

  // Mark payment as failed
  async markFailed(reason) {
    try {
      const updateData = {
        status: 'failed',
        failureReason: reason
      };

      await this.update(updateData);
      return this;
    } catch (error) {
      throw new Error(`Error marking payment as failed: ${error.message}`);
    }
  }

  // Process refund
  async processRefund(amount, reason) {
    try {
      const updateData = {
        status: 'refunded',
        refundAmount: amount,
        refundReason: reason,
        refundedAt: new Date()
      };

      await this.update(updateData);
      return this;
    } catch (error) {
      throw new Error(`Error processing refund: ${error.message}`);
    }
  }

  // Calculate total amount including fees and tips
  calculateTotalAmount() {
    return this.amount + this.processingFee + this.tip - this.discount;
  }

  // Convert to Firestore format
  toFirestore() {
    const data = { ...this };
    delete data.id;
    return data;
  }
}

module.exports = Payment;