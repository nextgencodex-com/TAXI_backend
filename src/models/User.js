const { db } = require('../config/firebase');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.phoneNumber = data.phoneNumber;
    this.role = data.role || 'passenger'; // passenger, driver
    this.rating = data.rating || 0;
    this.totalRides = data.totalRides || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Driver-specific fields
    if (this.role === 'driver') {
      this.vehicleInfo = data.vehicleInfo;
      this.isOnline = data.isOnline || false;
      this.currentLocation = data.currentLocation || null;
    }
  }

  // Create a new user
  static async create(userData) {
    try {
      const userRef = db.collection('users').doc();
      const user = new User({ ...userData, id: userRef.id });
      await userRef.set(user.toFirestore());
      return user;
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return new User({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding user: ${error.message}`);
    }
  }

  // Get all users
  static async getAll() {
    try {
      const snapshot = await db.collection('users').get();
      const users = [];
      snapshot.forEach(doc => {
        users.push(new User({ id: doc.id, ...doc.data() }));
      });
      return users;
    } catch (error) {
      throw new Error(`Error getting users: ${error.message}`);
    }
  }

  // Find user by phone number
  static async findByPhoneNumber(phoneNumber) {
    try {
      const snapshot = await db.collection('users').where('phoneNumber', '==', phoneNumber).get();
      if (snapshot.empty) {
        return null;
      }
      const doc = snapshot.docs[0];
      return new User({ id: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error finding user by phone: ${error.message}`);
    }
  }

  // Update user
  async update(updateData) {
    try {
      updateData.updatedAt = new Date();
      await db.collection('users').doc(this.id).update(updateData);
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Delete user
  async delete() {
    try {
      await db.collection('users').doc(this.id).delete();
      return true;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // Get all drivers within radius
  static async findNearbyDrivers(location, radiusKm = 10) {
    try {
      // Note: For production, you should use GeoFirestore for proper geospatial queries
      const snapshot = await db.collection('users')
        .where('role', '==', 'driver')
        .where('isOnline', '==', true)
        .where('isActive', '==', true)
        .get();

      const drivers = [];
      snapshot.forEach(doc => {
        const driver = new User({ id: doc.id, ...doc.data() });
        if (driver.currentLocation) {
          // Simple distance calculation (for production use proper geospatial library)
          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            driver.currentLocation.latitude,
            driver.currentLocation.longitude
          );
          if (distance <= radiusKm) {
            drivers.push({ ...driver, distance });
          }
        }
      });

      return drivers.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      throw new Error(`Error finding nearby drivers: ${error.message}`);
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
    const data = { ...this };
    delete data.id;
    return data;
  }
}

module.exports = User;