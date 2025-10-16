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
    // pickupDate: the actual date of the ride (selected by user). Accept multiple possible input keys.
    this.pickupDate = (function(d) {
      if (!d) return null;
      // if it's already a Date
      if (d instanceof Date) return d;
      // if it's an object with toDate (Firestore Timestamp)
      if (d && typeof d.toDate === 'function') {
        try { return d.toDate(); } catch { /* fallthrough */ }
      }
      // try parsing string
      try { return new Date(String(d)); } catch { return null; }
    })(data.pickupDate || data.date || (data.rawPayload && data.rawPayload.date));
    this.status = data.status || 'active';
    this.bookings = data.bookings || [];
    // Preserve original incoming payload for auditing/debugging
    this.rawPayload = data.rawPayload || null;
  }

  // Create a new shared ride
  static async create(rideData) {
    try {
      // Normalize incoming data: accept both flattened and nested shapes
      const normalized = {
        driverName: rideData.driverName || (rideData.driver && rideData.driver.name) || '',
        driverImage: rideData.driverImage || (rideData.driver && rideData.driver.image) || '',
        vehicle: rideData.vehicle || rideData.vehicleType || '',
        pickupLocation: rideData.pickupLocation || (rideData.pickup && rideData.pickup.location) || '',
        destinationLocation: rideData.destinationLocation || (rideData.destination && rideData.destination.location) || '',
        time: rideData.time || (rideData.time || '') ,
        duration: rideData.duration || '',
        passengers: rideData.passengers || (rideData.seats && String(rideData.seats.total)) || rideData.passengers || '',
        luggage: rideData.luggage || '',
        handCarry: rideData.handCarry || '',
        // Coerce numeric seat values and ensure availableSeats defaults to totalSeats when not provided
        totalSeats: (() => {
          if (rideData.totalSeats !== undefined && rideData.totalSeats !== null) return Number(rideData.totalSeats)
          if (rideData.seats && typeof rideData.seats.total !== 'undefined' && rideData.seats.total !== null) return Number(rideData.seats.total)
          return 0
        })(),
        availableSeats: (() => {
          if (rideData.availableSeats !== undefined && rideData.availableSeats !== null) return Number(rideData.availableSeats)
          if (rideData.seats && typeof rideData.seats.available !== 'undefined' && rideData.seats.available !== null) return Number(rideData.seats.available)
          // If available not provided, default to totalSeats (assume all seats available when created)
          const ts = (rideData.totalSeats !== undefined && rideData.totalSeats !== null) ? Number(rideData.totalSeats) : (rideData.seats && typeof rideData.seats.total !== 'undefined' ? Number(rideData.seats.total) : 0)
          return ts
        })(),
        price: rideData.price !== undefined ? rideData.price : rideData.price || '',
        frequency: rideData.frequency || 'one-time',
        postedDate: rideData.postedDate ? new Date(rideData.postedDate) : new Date(),
        // Persist any provided pickup date (from booking flow) if present
        pickupDate: rideData.pickupDate || rideData.date || (rideData.rawPayload && rideData.rawPayload.date) || undefined,
        // Store the original raw payload for auditing/debugging
        rawPayload: rideData.rawPayload || rideData || undefined,
        status: rideData.status || 'active',
        bookings: rideData.bookings || []
      };

      const rideRef = db.collection('sharedRides').doc();
      const ride = new SharedRide({
        ...normalized,
        id: rideRef.id,
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

      // Use a transaction to avoid race conditions when multiple users book concurrently
      const booking = await db.runTransaction(async (tx) => {
        const rideDoc = await tx.get(rideRef);
        if (!rideDoc.exists) {
          throw new Error('Shared ride not found');
        }

        const ride = rideDoc.data();
        const seatsToBook = Number(passengerData.seatsBooked || 1)

        // Determine current available seats. If availableSeats is missing or not a number,
        // try to infer from totalSeats or nested seats.total and existing bookings.
        // Compute inferred availability from totalSeats and existing bookings (if possible)
        const totalSeatsFromDoc = (ride && typeof ride.totalSeats === 'number') ? Number(ride.totalSeats) : (ride && ride.seats && typeof ride.seats.total === 'number' ? Number(ride.seats.total) : null)
        const bookedAlready = Array.isArray(ride && ride.bookings) ? ride.bookings.reduce((sum, b) => sum + (Number((b && b.seatsBooked) || 0)), 0) : 0
        const inferredAvailable = (totalSeatsFromDoc !== null) ? Math.max(0, totalSeatsFromDoc - bookedAlready) : null

        let currentAvailable = null

        if (ride && typeof ride.availableSeats === 'number') {
          // Prefer stored availableSeats unless it seems inconsistent with totalSeats/bookings
          const stored = Number(ride.availableSeats)
          if (inferredAvailable !== null && inferredAvailable !== stored) {
            // If inferredAvailable indicates more seats than stored (likely stored is stale), prefer inferredAvailable
            if (inferredAvailable > stored) {
              console.warn(`Available seats mismatch for ride ${rideId}: stored=${stored}, inferred=${inferredAvailable} (from totalSeats=${totalSeatsFromDoc} bookings=${bookedAlready}). Using inferred.`)
              currentAvailable = inferredAvailable
            } else {
              // Otherwise keep stored value (could be legitimately lower)
              console.warn(`Available seats mismatch for ride ${rideId}: stored=${stored}, inferred=${inferredAvailable}. Keeping stored.`)
              currentAvailable = stored
            }
          } else {
            currentAvailable = stored
          }
        } else if (inferredAvailable !== null) {
          currentAvailable = inferredAvailable
          console.warn(`Normalized availableSeats for ride ${rideId} from totalSeats (${totalSeatsFromDoc}) and bookings (${bookedAlready}) => ${currentAvailable}`)
        }

        if (currentAvailable === null) {
          // Could not determine available seats
          console.error(`Unable to determine available seats for ride ${rideId}. ride doc:`, ride)
          throw new Error('No seats available')
        }

        if (seatsToBook > currentAvailable) {
          console.warn(`Requested ${seatsToBook} seats but only ${currentAvailable} available for ride ${rideId}`)
          throw new Error('No seats available')
        }

        const newBooking = {
          id: db.collection('bookings').doc().id,
          rideId: rideId,
          passengerName: passengerData.passengerName,
          passengerPhone: passengerData.passengerPhone,
          seatsBooked: seatsToBook,
          bookingDate: new Date(),
          status: 'confirmed'
        };

        const updatedBookings = Array.isArray(ride.bookings) ? [...ride.bookings, newBooking] : [newBooking];

        // Compute the new available seats based on currentAvailable (inferred or recorded)
        const newAvailable = Math.max(0, currentAvailable - seatsToBook)

        tx.update(rideRef, {
          availableSeats: newAvailable,
          bookings: updatedBookings,
          updatedAt: new Date()
        });

        return newBooking;
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
      driverName: this.driverName || '',
      driverImage: this.driverImage || '',
      vehicle: this.vehicle || '',
      pickupLocation: this.pickupLocation || '',
      destinationLocation: this.destinationLocation || '',
      time: this.time || '',
      duration: this.duration || '',
      passengers: this.passengers || '',
      luggage: this.luggage || '',
      handCarry: this.handCarry || '',
      availableSeats: (() => { const v = Number(this.availableSeats); return isNaN(v) ? 0 : v })(),
      totalSeats: (() => { const v = Number(this.totalSeats); return isNaN(v) ? 0 : v })(),
      price: this.price !== undefined ? this.price : '',
      frequency: this.frequency || 'one-time',
      postedDate: this.postedDate || new Date(),
      // if pickupDate was set, persist it as an ISO-friendly Date object
      pickupDate: this.pickupDate || null,
      // store raw payload when available for debugging and auditing
      rawPayload: this.rawPayload || null,
      status: this.status || 'active',
      bookings: this.bookings || []
    };
  }
}

module.exports = SharedRide;