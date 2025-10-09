const { db } = require('../config/firebase');

class SharedRide {
  constructor(data) {
    this.id = data.id || null;
    this.driverName = data.driverName;
    this.driverImage = data.driverImage;
    this.vehicle = data.vehicle;
    this.pickupLocation = data.pickupLocation;
    this.destinationLocation = data.destinationLocation;
    this.time = data.time;
    this.duration = data.duration;
    this.passengers = data.passengers;
    this.luggage = data.luggage;
    this.handCarry = data.handCarry;
    this.availableSeats = data.availableSeats;
    this.totalSeats = data.totalSeats;
    this.price = data.price;
    this.frequency = data.frequency;
    this.postedDate = data.postedDate || new Date();
    this.status = data.status || 'active';
    this.bookings = data.bookings || [];
  }

  // Create a new shared ride
  static async create(rideData) {
    try {
      const rideRef = db.collection('sharedRides').doc();
      const ride = new SharedRide({
        ...rideData,
        id: rideRef.id,
        postedDate: new Date()
      });

      await rideRef.set(ride.toFirestore());
      return { id: rideRef.id, ...ride };
    } catch (error) {
      console.error('Error creating shared ride:', error);
      throw new Error('Failed to create shared ride');
    }
  }

  // Get all shared rides
  static async getAll() {
    try {
      const ridesSnapshot = await db.collection('sharedRides')
        .orderBy('postedDate', 'desc')
        .get();

      return ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching shared rides:', error);
      throw new Error('Failed to fetch shared rides');
    }
  }

  // Get shared rides by pickup location
  static async getByPickupLocation(location, limit = 10) {
    try {
      const ridesSnapshot = await db.collection('sharedRides')
        .where('pickupLocation', '>=', location)
        .where('pickupLocation', '<=', location + '\uf8ff')
        .where('status', '==', 'active')
        .orderBy('pickupLocation')
        .orderBy('postedDate', 'desc')
        .limit(limit)
        .get();

      return ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error searching shared rides:', error);
      throw new Error('Failed to search shared rides');
    }
  }

  // Get a specific shared ride
  static async getById(rideId) {
    try {
      const rideDoc = await db.collection('sharedRides').doc(rideId).get();
      
      if (!rideDoc.exists) {
        throw new Error('Shared ride not found');
      }

      return {
        id: rideDoc.id,
        ...rideDoc.data()
      };
    } catch (error) {
      console.error('Error fetching shared ride:', error);
      throw error;
    }
  }

  // Update a shared ride
  static async update(rideId, updateData) {
    try {
      const rideRef = db.collection('sharedRides').doc(rideId);
      await rideRef.update({
        ...updateData,
        updatedAt: new Date()
      });

      const updatedRide = await this.getById(rideId);
      return updatedRide;
    } catch (error) {
      console.error('Error updating shared ride:', error);
      throw new Error('Failed to update shared ride');
    }
  }

  // Delete a shared ride
  static async delete(rideId) {
    try {
      await db.collection('sharedRides').doc(rideId).delete();
      return { message: 'Shared ride deleted successfully' };
    } catch (error) {
      console.error('Error deleting shared ride:', error);
      throw new Error('Failed to delete shared ride');
    }
  }

  // Book a seat in shared ride
  static async bookSeat(rideId, passengerData) {
    try {
      const rideRef = db.collection('sharedRides').doc(rideId);
      const rideDoc = await rideRef.get();

      if (!rideDoc.exists) {
        throw new Error('Shared ride not found');
      }

      const ride = rideDoc.data();
      
      if (ride.availableSeats <= 0) {
        throw new Error('No seats available');
      }

      // Create booking
      const booking = {
        id: db.collection('bookings').doc().id,
        rideId: rideId,
        passengerName: passengerData.passengerName,
        passengerPhone: passengerData.passengerPhone,
        seatsBooked: passengerData.seatsBooked || 1,
        bookingDate: new Date(),
        status: 'confirmed'
      };

      // Update ride with new booking
      await rideRef.update({
        availableSeats: ride.availableSeats - booking.seatsBooked,
        bookings: [...(ride.bookings || []), booking],
        updatedAt: new Date()
      });

      return booking;
    } catch (error) {
      console.error('Error booking shared ride:', error);
      throw error;
    }
  }

  // Convert to Firestore format
  toFirestore() {
    return {
      driverName: this.driverName,
      driverImage: this.driverImage,
      vehicle: this.vehicle,
      pickupLocation: this.pickupLocation,
      destinationLocation: this.destinationLocation,
      time: this.time,
      duration: this.duration,
      passengers: this.passengers,
      luggage: this.luggage,
      handCarry: this.handCarry,
      availableSeats: Number(this.availableSeats),
      totalSeats: Number(this.totalSeats),
      price: this.price,
      frequency: this.frequency,
      postedDate: this.postedDate,
      status: this.status,
      bookings: this.bookings
    };
  }
}

module.exports = SharedRide;