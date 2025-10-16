const { db } = require('../config/firebase');

class Ride {
  constructor(data) {
    this.id = data.id;
    this.passengerId = data.passengerId;
    this.driverId = data.driverId || null;
    this.pickupLocation = data.pickupLocation;
    this.destination = data.destination;
    this.pickupAddress = data.pickupAddress;
    this.destinationAddress = data.destinationAddress;
    this.rideType = data.rideType; // 'standard', 'shared', 'premium', 'van'
    this.status = data.status || 'pending'; // pending, accepted, in_progress, completed, cancelled
    this.fare = data.fare || null;
    this.estimatedDuration = data.estimatedDuration || null;
    this.estimatedDistance = data.estimatedDistance || null;
    this.actualDuration = data.actualDuration || null;
    this.actualDistance = data.actualDistance || null;
    this.paymentMethod = data.paymentMethod;
    this.paymentStatus = data.paymentStatus || 'pending'; // pending, paid, failed, refunded
    this.scheduledTime = data.scheduledTime || null;
    this.pickupTime = data.pickupTime || null;
    this.completedTime = data.completedTime || null;
    this.passengers = data.passengers || 1;
    this.notes = data.notes || '';
    this.rating = data.rating || null;
    this.feedback = data.feedback || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Shared ride specific fields
    if (this.rideType === 'shared') {
      this.maxPassengers = data.maxPassengers || 4;
      this.currentPassengers = data.currentPassengers || 0;
      this.sharedRidePassengers = data.sharedRidePassengers || [];
    }
  }

  // Create a new ride
  static async create(rideData) {
    try {
      const rideRef = db.collection('rides').doc();
      const ride = new Ride({ ...rideData, id: rideRef.id });
      await rideRef.set(ride.toFirestore());
      return ride;
    } catch (error) {
      throw new Error(`Error creating ride: ${error.message}`);
    }
  }

  // Find ride by ID
  static async findById(id) {
    try {
      const doc = await db.collection('rides').doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return new Ride({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding ride: ${error.message}`);
    }
  }

  // Find rides by passenger ID
  static async findByPassengerId(passengerId, limit = 10) {
    try {
      const snapshot = await db.collection('rides')
        .where('passengerId', '==', passengerId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const rides = [];
      snapshot.forEach(doc => {
        rides.push(new Ride({ id: doc.id, ...doc.data() }));
      });
      return rides;
    } catch (error) {
      throw new Error(`Error finding rides by passenger: ${error.message}`);
    }
  }

  // Find rides by driver ID
  static async findByDriverId(driverId, limit = 10) {
    try {
      const snapshot = await db.collection('rides')
        .where('driverId', '==', driverId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const rides = [];
      snapshot.forEach(doc => {
        rides.push(new Ride({ id: doc.id, ...doc.data() }));
      });
      return rides;
    } catch (error) {
      throw new Error(`Error finding rides by driver: ${error.message}`);
    }
  }

  // Find pending rides for drivers
  static async findPendingRides(location = null, radiusKm = 10) {
    try {
      let query = db.collection('rides')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'asc');

      const snapshot = await query.get();
      const rides = [];
      
      snapshot.forEach(doc => {
        const ride = new Ride({ id: doc.id, ...doc.data() });
        
        if (location && ride.pickupLocation) {
          // Calculate distance for location-based filtering
          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            ride.pickupLocation.latitude,
            ride.pickupLocation.longitude
          );
          
          if (distance <= radiusKm) {
            rides.push({ ...ride, distance });
          }
        } else {
          rides.push(ride);
        }
      });

      return rides.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      throw new Error(`Error finding pending rides: ${error.message}`);
    }
  }

  // Find available shared rides
  static async findAvailableSharedRides(pickupLocation, destination, radiusKm = 5) {
    try {
      const snapshot = await db.collection('rides')
        .where('rideType', '==', 'shared')
        .where('status', 'in', ['pending', 'accepted'])
        .get();

      const availableRides = [];
      
      snapshot.forEach(doc => {
        const ride = new Ride({ id: doc.id, ...doc.data() });
        
        if (ride.currentPassengers < ride.maxPassengers) {
          // Check if pickup and destination are within reasonable distance
          const pickupDistance = this.calculateDistance(
            pickupLocation.latitude,
            pickupLocation.longitude,
            ride.pickupLocation.latitude,
            ride.pickupLocation.longitude
          );
          
          const destDistance = this.calculateDistance(
            destination.latitude,
            destination.longitude,
            ride.destination.latitude,
            ride.destination.longitude
          );
          
          if (pickupDistance <= radiusKm && destDistance <= radiusKm) {
            availableRides.push({ ...ride, pickupDistance, destDistance });
          }
        }
      });

      return availableRides.sort((a, b) => a.pickupDistance - b.pickupDistance);
    } catch (error) {
      throw new Error(`Error finding available shared rides: ${error.message}`);
    }
  }

  // Update ride
  async update(updateData) {
    try {
      updateData.updatedAt = new Date();
      await db.collection('rides').doc(this.id).update(updateData);
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating ride: ${error.message}`);
    }
  }

  // Update ride status
  async updateStatus(status, additionalData = {}) {
    try {
      const updateData = { status, ...additionalData, updatedAt: new Date() };
      
      // Add timestamp for specific status changes
      if (status === 'accepted') {
        updateData.acceptedTime = new Date();
      } else if (status === 'in_progress') {
        updateData.pickupTime = new Date();
      } else if (status === 'completed') {
        updateData.completedTime = new Date();
      }

      await this.update(updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating ride status: ${error.message}`);
    }
  }

  // Add passenger to shared ride
  async addPassenger(passengerId, pickupLocation, destination) {
    try {
      if (this.rideType !== 'shared') {
        throw new Error('This is not a shared ride');
      }
      
      if (this.currentPassengers >= this.maxPassengers) {
        throw new Error('Ride is full');
      }

      const passengerData = {
        passengerId,
        pickupLocation,
        destination,
        joinedAt: new Date()
      };

      const updatedPassengers = [...this.sharedRidePassengers, passengerData];
      
      await this.update({
        sharedRidePassengers: updatedPassengers,
        currentPassengers: this.currentPassengers + 1
      });

      return this;
    } catch (error) {
      throw new Error(`Error adding passenger to shared ride: ${error.message}`);
    }
  }

  // Calculate distance between two coordinates
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
  }

  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Convert to Firestore format
  toFirestore() {
    const raw = { ...this };
    delete raw.id;

    // Remove undefined properties because Firestore rejects undefined values
    const data = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value !== undefined) data[key] = value;
    }

    return data;
  }
}

module.exports = Ride;