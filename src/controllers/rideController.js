const { Ride, User, Booking } = require('../models');
const { db } = require('../config/firebase');

class RideController {
  // Create a new ride request
  static async createRide(req, res) {
    try {
      const {
        passengerName,
        passengerPhone,
        pickupLocation,
        destination,
        pickupAddress,
        destinationAddress,
        rideType,
        passengers,
        notes,
      } = req.body;

      // Validate required fields
      if (!passengerName || !passengerPhone || !pickupLocation || !destination || !rideType) {
        return res.status(400).json({
          success: false,
          message: 'Passenger name, phone, pickup location, destination, and ride type are required',
        });
      }

      // Create or find passenger
      let passenger = await User.findByPhoneNumber(passengerPhone);
      if (!passenger) {
        passenger = await User.create({
          name: passengerName,
          phoneNumber: passengerPhone,
          role: 'passenger'
        });
      }

      // Create ride
      const ride = await Ride.create({
        passengerId: passenger.id,
        pickupLocation,
        destination,
        pickupAddress,
        destinationAddress,
        rideType,
        passengers: passengers || 1,
        notes: notes || '',
      });

      // Create booking
      const booking = await Booking.create({
        rideId: ride.id,
        passengerId: passenger.id,
        bookingType: 'immediate',
      });

      res.status(201).json({
        success: true,
        message: 'Ride created successfully',
        data: { ride, booking, passenger },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get all rides
  static async getAllRides(req, res) {
    try {
      const { status, rideType, limit = 20 } = req.query;
      
      let query = db.collection('rides');
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (rideType) {
        query = query.where('rideType', '==', rideType);
      }
      
      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .get();
      
      const rides = [];
      snapshot.forEach(doc => {
        rides.push(new Ride({ id: doc.id, ...doc.data() }));
      });

      res.json({
        success: true,
        data: { rides },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get pending rides for drivers
  static async getPendingRides(req, res) {
    try {
      const { lat, lng, radius = 10 } = req.query;

      let location = null;
      if (lat && lng) {
        location = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        };
      }

      const rides = await Ride.findPendingRides(location, parseInt(radius));

      res.json({
        success: true,
        data: { rides },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Accept a ride (driver)
  static async acceptRide(req, res) {
    try {
      const { rideId } = req.params;
      const { driverName, driverPhone, vehicleInfo } = req.body;

      if (!driverName || !driverPhone) {
        return res.status(400).json({
          success: false,
          message: 'Driver name and phone are required',
        });
      }

      // Create or find driver
      let driver = await User.findByPhoneNumber(driverPhone);
      if (!driver) {
        driver = await User.create({
          name: driverName,
          phoneNumber: driverPhone,
          role: 'driver',
          vehicleInfo: vehicleInfo || {},
          isOnline: true
        });
      }

      // Get ride
      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found',
        });
      }

      if (ride.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Ride is not available for acceptance',
        });
      }

      // Update ride status
      await ride.updateStatus('accepted', { driverId: driver.id });

      // Update booking with driver info
      const booking = await Booking.findByRideId(rideId);
      if (booking) {
        await booking.update({ driverId: driver.id });
      }

      res.json({
        success: true,
        message: 'Ride accepted successfully',
        data: { ride, driver },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Start ride (driver)
  static async startRide(req, res) {
    try {
      const { rideId } = req.params;

      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found',
        });
      }

      if (ride.status !== 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'Ride cannot be started. Current status: ' + ride.status,
        });
      }

      await ride.updateStatus('in_progress');

      res.json({
        success: true,
        message: 'Ride started successfully',
        data: { ride },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Complete ride (driver)
  static async completeRide(req, res) {
    try {
      const { rideId } = req.params;
      const { actualDistance, actualDuration, fare } = req.body;

      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found',
        });
      }

      if (ride.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: 'Ride cannot be completed. Current status: ' + ride.status,
        });
      }

      // Update ride
      await ride.updateStatus('completed', {
        actualDistance,
        actualDuration,
        fare,
      });

      // Update booking
      const booking = await Booking.findByRideId(rideId);
      if (booking) {
        await booking.complete();
      }

      res.json({
        success: true,
        message: 'Ride completed successfully',
        data: { ride },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cancel ride
  static async cancelRide(req, res) {
    try {
      const { rideId } = req.params;
      const { reason } = req.body;

      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found',
        });
      }

      if (ride.status === 'completed' || ride.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Ride cannot be cancelled. Current status: ' + ride.status,
        });
      }

      // Update ride status
      await ride.updateStatus('cancelled', { cancellationReason: reason });

      // Update booking
      const booking = await Booking.findByRideId(rideId);
      if (booking) {
        await booking.cancel(reason, 'system');
      }

      res.json({
        success: true,
        message: 'Ride cancelled successfully',
        data: { ride },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Get ride details
  static async getRide(req, res) {
    try {
      const { rideId } = req.params;

      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found',
        });
      }

      // Get passenger and driver details
      const passenger = await User.findById(ride.passengerId);
      const driver = ride.driverId ? await User.findById(ride.driverId) : null;

      res.json({
        success: true,
        data: { ride, passenger, driver },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Rate ride
  static async rateRide(req, res) {
    try {
      const { rideId } = req.params;
      const { rating, feedback } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5',
        });
      }

      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found',
        });
      }

      if (ride.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'You can only rate completed rides',
        });
      }

      // Update ride with rating
      await ride.update({ rating, feedback });

      res.json({
        success: true,
        message: 'Ride rated successfully',
        data: { ride },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Find shared rides
  static async findSharedRides(req, res) {
    try {
      const { pickupLat, pickupLng, destLat, destLng, radius = 5 } = req.query;

      if (!pickupLat || !pickupLng || !destLat || !destLng) {
        return res.status(400).json({
          success: false,
          message: 'Pickup and destination coordinates are required',
        });
      }

      const pickupLocation = {
        latitude: parseFloat(pickupLat),
        longitude: parseFloat(pickupLng),
      };

      const destination = {
        latitude: parseFloat(destLat),
        longitude: parseFloat(destLng),
      };

      const sharedRides = await Ride.findAvailableSharedRides(
        pickupLocation,
        destination,
        parseFloat(radius)
      );

      res.json({
        success: true,
        data: { sharedRides },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Join shared ride
  static async joinSharedRide(req, res) {
    try {
      const { rideId } = req.params;
      const { passengerName, passengerPhone, pickupLocation, destination } = req.body;

      if (!passengerName || !passengerPhone) {
        return res.status(400).json({
          success: false,
          message: 'Passenger name and phone are required',
        });
      }

      // Create or find passenger
      let passenger = await User.findByPhoneNumber(passengerPhone);
      if (!passenger) {
        passenger = await User.create({
          name: passengerName,
          phoneNumber: passengerPhone,
          role: 'passenger'
        });
      }

      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found',
        });
      }

      if (ride.rideType !== 'shared') {
        return res.status(400).json({
          success: false,
          message: 'This is not a shared ride',
        });
      }

      await ride.addPassenger(passenger.id, pickupLocation, destination);

      res.json({
        success: true,
        message: 'Successfully joined shared ride',
        data: { ride, passenger },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = RideController;