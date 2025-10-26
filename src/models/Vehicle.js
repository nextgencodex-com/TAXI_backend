const { db } = require('../config/firebase');

class Vehicle {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.price = data.price;
    this.passengers = data.passengers;
    this.luggage = data.luggage;
    this.handCarry = data.handCarry;
    this.image = data.image;
    this.features = data.features || [];
    this.gradient = data.gradient || 'bg-gradient-to-br from-blue-400 to-blue-600';
    this.buttonColor = data.buttonColor || 'bg-blue-600 hover:bg-blue-700';
    this.status = data.status || 'active';
    this.createdAt = data.createdAt || new Date();
    this.isAvailable = data.isAvailable !== undefined ? data.isAvailable : true;
  }

  // Create a new vehicle
  static async create(vehicleData) {
    try {
      const generateDocId = () => `STSL-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const newId = generateDocId();
      const vehicleRef = db.collection('vehicles').doc(newId);
      const vehicle = new Vehicle({
        ...vehicleData,
        id: vehicleRef.id,
        createdAt: new Date()
      });

      await vehicleRef.set(vehicle.toFirestore());
      return { id: vehicleRef.id, ...vehicle };
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw new Error('Failed to create vehicle');
    }
  }

  // Get all vehicles
  static async getAll() {
    try {
      // Simplified query to avoid index requirements
      const vehiclesSnapshot = await db.collection('vehicles').get();
      
      // Filter and sort in memory to avoid Firestore index requirements
      const vehicles = vehiclesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(vehicle => vehicle.status !== 'deleted')
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
          const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
          return bTime - aTime;
        });

      return vehicles;
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw new Error('Failed to fetch vehicles');
    }
  }

  // Get available vehicles
  static async getAvailable() {
    try {
      // Simplified query to avoid index requirements
      const vehiclesSnapshot = await db.collection('vehicles').get();
      
      // Filter and sort in memory to avoid Firestore index requirements
      const vehicles = vehiclesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(vehicle => vehicle.status !== 'deleted' && vehicle.isAvailable === true)
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
          const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
          return bTime - aTime;
        });

      return vehicles;
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      throw new Error('Failed to fetch available vehicles');
    }
  }

  // Get vehicles by passenger capacity
  static async getByPassengerCount(minPassengers) {
    try {
      // Simplified query to avoid index requirements
      const vehiclesSnapshot = await db.collection('vehicles').get();
      
      // Filter and sort in memory to avoid Firestore index requirements
      const vehicles = vehiclesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(vehicle => {
          return vehicle.status !== 'deleted' && 
                 vehicle.isAvailable === true &&
                 parseInt(vehicle.passengers) >= parseInt(minPassengers);
        })
        .sort((a, b) => {
          // Sort by passengers first, then by createdAt desc
          const passengersA = parseInt(a.passengers);
          const passengersB = parseInt(b.passengers);
          if (passengersA !== passengersB) {
            return passengersA - passengersB;
          }
          const aTime = a.createdAt?.seconds || a.createdAt?.getTime?.() || 0;
          const bTime = b.createdAt?.seconds || b.createdAt?.getTime?.() || 0;
          return bTime - aTime;
        });

      return vehicles;
    } catch (error) {
      console.error('Error fetching vehicles by passenger count:', error);
      throw new Error('Failed to fetch vehicles by passenger count');
    }
  }

  // Get a specific vehicle
  static async getById(vehicleId) {
    try {
      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      
      if (!vehicleDoc.exists) {
        throw new Error('Vehicle not found');
      }

      return {
        id: vehicleDoc.id,
        ...vehicleDoc.data()
      };
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      throw error;
    }
  }

  // Update a vehicle
  static async update(vehicleId, updateData) {
    try {
      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      await vehicleRef.update({
        ...updateData,
        updatedAt: new Date()
      });

      const updatedVehicle = await this.getById(vehicleId);
      return updatedVehicle;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw new Error('Failed to update vehicle');
    }
  }

  // Delete a vehicle (soft delete)
  static async delete(vehicleId) {
    try {
      await db.collection('vehicles').doc(vehicleId).update({
        status: 'deleted',
        deletedAt: new Date()
      });
      return { message: 'Vehicle deleted successfully' };
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw new Error('Failed to delete vehicle');
    }
  }

  // Update vehicle availability
  static async updateAvailability(vehicleId, isAvailable) {
    try {
      const vehicleRef = db.collection('vehicles').doc(vehicleId);
      await vehicleRef.update({
        isAvailable: isAvailable,
        updatedAt: new Date()
      });

      const updatedVehicle = await this.getById(vehicleId);
      return updatedVehicle;
    } catch (error) {
      console.error('Error updating vehicle availability:', error);
      throw new Error('Failed to update vehicle availability');
    }
  }

  // Search vehicles by name or features
  static async search(searchTerm, limit = 10) {
    try {
      const searchTermLower = searchTerm.toLowerCase();
      
      // Simplified query to avoid index requirements
      const vehiclesSnapshot = await db.collection('vehicles').get();
      
      // Filter and search in memory to avoid Firestore index requirements
      const vehicles = vehiclesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(vehicle => {
          if (vehicle.status === 'deleted') return false;
          
          const nameMatch = vehicle.name?.toLowerCase().includes(searchTermLower);
          const featureMatch = vehicle.features?.some(feature => 
            feature.toLowerCase().includes(searchTermLower)
          );
          
          return nameMatch || featureMatch;
        })
        .slice(0, limit);

      return vehicles;
    } catch (error) {
      console.error('Error searching vehicles:', error);
      throw new Error('Failed to search vehicles');
    }
  }

  // Convert to Firestore format
  toFirestore() {
    return {
      name: this.name,
      price: this.price,
      passengers: this.passengers,
      luggage: this.luggage,
      handCarry: this.handCarry,
      image: this.image,
      features: this.features,
      gradient: this.gradient,
      buttonColor: this.buttonColor,
      status: this.status,
      createdAt: this.createdAt,
      isAvailable: this.isAvailable
    };
  }
}

module.exports = Vehicle;