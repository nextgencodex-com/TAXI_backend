const SharedRide = require('../models/SharedRide');

// Get all shared rides
const getAllSharedRides = async (req, res) => {
  try {
    const rides = await SharedRide.getAll();
    res.status(200).json({
      success: true,
      data: {
        rides: rides,
        count: rides.length
      }
    });
  } catch (error) {
    console.error('Error fetching shared rides:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shared rides',
      error: error.message
    });
  }
};

// Get shared rides by pickup location
const getSharedRidesByLocation = async (req, res) => {
  try {
    const { location } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Pickup location is required'
      });
    }

    const rides = await SharedRide.getByPickupLocation(location, limit);
    res.status(200).json({
      success: true,
      data: {
        rides: rides,
        count: rides.length,
        searchLocation: location
      }
    });
  } catch (error) {
    console.error('Error searching shared rides:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search shared rides',
      error: error.message
    });
  }
};

// Get a specific shared ride
const getSharedRideById = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await SharedRide.getById(rideId);
    
    res.status(200).json({
      success: true,
      data: { ride }
    });
  } catch (error) {
    console.error('Error fetching shared ride:', error);
    if (error.message === 'Shared ride not found') {
      res.status(404).json({
        success: false,
        message: 'Shared ride not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shared ride',
        error: error.message
      });
    }
  }
};

// Create a new shared ride
const createSharedRide = async (req, res) => {
  try {
    const {
      driverName,
      driverImage,
      vehicle,
      pickupLocation,
      destinationLocation,
      time,
      duration,
      passengers,
      luggage,
      handCarry,
      availableSeats,
      totalSeats,
      price,
      frequency
    } = req.body;

    // Validate required fields
    if (!driverName || !vehicle || !pickupLocation || !destinationLocation || 
        !time || !duration || !availableSeats || !totalSeats || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate seat numbers
    const availableSeatsNum = parseInt(availableSeats);
    const totalSeatsNum = parseInt(totalSeats);

    if (availableSeatsNum > totalSeatsNum || availableSeatsNum < 0 || totalSeatsNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seat configuration'
      });
    }

    const rideData = {
      driverName,
      driverImage: driverImage || '/images/default-driver.jpg',
      vehicle,
      pickupLocation,
      destinationLocation,
      time,
      duration,
      passengers: passengers || '1',
      luggage: luggage || '0',
      handCarry: handCarry || '0',
      availableSeats: availableSeatsNum,
      totalSeats: totalSeatsNum,
      price,
      frequency: frequency || 'one-time'
    };

    const newRide = await SharedRide.create(rideData);

    res.status(201).json({
      success: true,
      message: 'Shared ride created successfully',
      data: { ride: newRide }
    });
  } catch (error) {
    console.error('Error creating shared ride:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shared ride',
      error: error.message
    });
  }
};

// Update a shared ride
const updateSharedRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updateData = req.body;

    // Validate seat numbers if provided
    if (updateData.availableSeats !== undefined && updateData.totalSeats !== undefined) {
      const availableSeatsNum = parseInt(updateData.availableSeats);
      const totalSeatsNum = parseInt(updateData.totalSeats);

      if (availableSeatsNum > totalSeatsNum || availableSeatsNum < 0 || totalSeatsNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid seat configuration'
        });
      }

      updateData.availableSeats = availableSeatsNum;
      updateData.totalSeats = totalSeatsNum;
    }

    const updatedRide = await SharedRide.update(rideId, updateData);

    res.status(200).json({
      success: true,
      message: 'Shared ride updated successfully',
      data: { ride: updatedRide }
    });
  } catch (error) {
    console.error('Error updating shared ride:', error);
    if (error.message === 'Shared ride not found') {
      res.status(404).json({
        success: false,
        message: 'Shared ride not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update shared ride',
        error: error.message
      });
    }
  }
};

// Delete a shared ride
const deleteSharedRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    await SharedRide.delete(rideId);

    res.status(200).json({
      success: true,
      message: 'Shared ride deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shared ride:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shared ride',
      error: error.message
    });
  }
};

// Book a seat in shared ride
const bookSharedRideSeat = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { passengerName, passengerPhone, seatsBooked } = req.body;

    if (!passengerName || !passengerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Passenger name and phone are required'
      });
    }

    const passengerData = {
      passengerName,
      passengerPhone,
      seatsBooked: seatsBooked || 1
    };

    const booking = await SharedRide.bookSeat(rideId, passengerData);

    res.status(201).json({
      success: true,
      message: 'Seat booked successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Error booking shared ride:', error);
    if (error.message === 'Shared ride not found') {
      res.status(404).json({
        success: false,
        message: 'Shared ride not found'
      });
    } else if (error.message === 'No seats available') {
      res.status(400).json({
        success: false,
        message: 'No seats available'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to book seat',
        error: error.message
      });
    }
  }
};

module.exports = {
  getAllSharedRides,
  getSharedRidesByLocation,
  getSharedRideById,
  createSharedRide,
  updateSharedRide,
  deleteSharedRide,
  bookSharedRideSeat
};