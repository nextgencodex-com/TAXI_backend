const { db } = require('../config/firebase');

class Booking {
  constructor(data) {
    this.id = data.id;
    this.rideId = data.rideId;
    this.passengerId = data.passengerId;
    this.driverId = data.driverId || null;
    this.bookingNumber = data.bookingNumber;
    this.status = data.status || 'confirmed'; // confirmed, cancelled, completed
    this.bookingType = data.bookingType || 'immediate'; // immediate, scheduled
    this.paymentDetails = data.paymentDetails || {};
    this.cancellationReason = data.cancellationReason || null;
    this.cancellationFee = data.cancellationFee || 0;
    this.specialRequests = data.specialRequests || '';
    this.promoCode = data.promoCode || null;
    this.discount = data.discount || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new booking
  static async create(bookingData) {
    try {
      // Generate a readable/custom document id for Firestore (e.g. SMST-<timestamp>-<4digits>)
      const generateDocId = () => `STSL-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const newId = generateDocId();
      const bookingRef = db.collection('bookings').doc(newId);
      const bookingNumber = await this.generateBookingNumber();

      const booking = new Booking({
        ...bookingData,
        id: bookingRef.id,
        bookingNumber,
      });

      await bookingRef.set(booking.toFirestore());
      return booking;
    } catch (error) {
      throw new Error(`Error creating booking: ${error.message}`);
    }
  }

  // Generate unique booking number
  static async generateBookingNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BK${timestamp}${random}`;
  }

  // Find booking by ID
  static async findById(id) {
    try {
      const doc = await db.collection('bookings').doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return new Booking({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding booking: ${error.message}`);
    }
  }

  // Find booking by ride ID
  static async findByRideId(rideId) {
    try {
      const snapshot = await db.collection('bookings')
        .where('rideId', '==', rideId)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return new Booking({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding booking by ride ID: ${error.message}`);
    }
  }

  // Find booking by booking number
  static async findByBookingNumber(bookingNumber) {
    try {
      const snapshot = await db.collection('bookings')
        .where('bookingNumber', '==', bookingNumber)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return new Booking({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding booking by number: ${error.message}`);
    }
  }

  // Find bookings by passenger ID
  static async findByPassengerId(passengerId, limit = 10) {
    try {
      const snapshot = await db.collection('bookings')
        .where('passengerId', '==', passengerId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const bookings = [];
      snapshot.forEach(doc => {
        bookings.push(new Booking({ id: doc.id, ...doc.data() }));
      });
      return bookings;
    } catch (error) {
      throw new Error(`Error finding bookings by passenger: ${error.message}`);
    }
  }

  // Find bookings by driver ID
  static async findByDriverId(driverId, limit = 10) {
    try {
      const snapshot = await db.collection('bookings')
        .where('driverId', '==', driverId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const bookings = [];
      snapshot.forEach(doc => {
        bookings.push(new Booking({ id: doc.id, ...doc.data() }));
      });
      return bookings;
    } catch (error) {
      throw new Error(`Error finding bookings by driver: ${error.message}`);
    }
  }

  // Update booking
  async update(updateData) {
    try {
      updateData.updatedAt = new Date();
      await db.collection('bookings').doc(this.id).update(updateData);
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating booking: ${error.message}`);
    }
  }

  // Cancel booking
  async cancel(reason, userId, cancellationFee = 0) {
    try {
      const updateData = {
        status: 'cancelled',
        cancellationReason: reason,
        cancellationFee,
        cancelledBy: userId,
        cancelledAt: new Date()
      };

      await this.update(updateData);
      return this;
    } catch (error) {
      throw new Error(`Error cancelling booking: ${error.message}`);
    }
  }

  // Complete booking
  async complete(paymentDetails = {}) {
    try {
      const updateData = {
        status: 'completed',
        paymentDetails: { ...this.paymentDetails, ...paymentDetails },
        completedAt: new Date()
      };

      await this.update(updateData);
      return this;
    } catch (error) {
      throw new Error(`Error completing booking: ${error.message}`);
    }
  }

  // Convert to Firestore format
  toFirestore() {
    const data = { ...this };
    delete data.id;
    return data;
  }
}

module.exports = Booking;