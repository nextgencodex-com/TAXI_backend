const Vehicle = require('../models/Vehicle');

// Get all vehicles
const getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.getAll();
    res.status(200).json({
      success: true,
      data: {
        vehicles: vehicles,
        count: vehicles.length
      }
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicles',
      error: error.message
    });
  }
};

// Get available vehicles
const getAvailableVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.getAvailable();
    res.status(200).json({
      success: true,
      data: {
        vehicles: vehicles,
        count: vehicles.length
      }
    });
  } catch (error) {
    console.error('Error fetching available vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available vehicles',
      error: error.message
    });
  }
};

// Get vehicles by passenger capacity
const getVehiclesByPassengerCount = async (req, res) => {
  try {
    const { passengers } = req.query;
    
    if (!passengers) {
      return res.status(400).json({
        success: false,
        message: 'Passenger count is required'
      });
    }

    const minPassengers = parseInt(passengers);
    if (isNaN(minPassengers) || minPassengers < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid passenger count'
      });
    }

    const vehicles = await Vehicle.getByPassengerCount(minPassengers);
    res.status(200).json({
      success: true,
      data: {
        vehicles: vehicles,
        count: vehicles.length,
        minPassengers: minPassengers
      }
    });
  } catch (error) {
    console.error('Error fetching vehicles by passenger count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicles by passenger count',
      error: error.message
    });
  }
};

// Get a specific vehicle
const getVehicleById = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.getById(vehicleId);
    
    res.status(200).json({
      success: true,
      data: { vehicle }
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    if (error.message === 'Vehicle not found') {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vehicle',
        error: error.message
      });
    }
  }
};

// Create a new vehicle
const createVehicle = async (req, res) => {
  try {
    const {
      name,
      price,
      passengers,
      luggage,
      handCarry,
      image,
      features,
      gradient,
      buttonColor
    } = req.body;

    // Validate required fields
    if (!name || !price || !passengers) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and passenger capacity are required'
      });
    }

    // Parse and validate features
    let featuresArray = [];
    if (Array.isArray(features)) {
      featuresArray = features.filter(feature => feature && feature.trim());
    } else if (typeof features === 'string') {
      featuresArray = [features];
    }

    const vehicleData = {
      name,
      price,
      passengers: passengers || '4',
      luggage: luggage || '2',
      handCarry: handCarry || '2',
      image: image || '/images/default-vehicle.jpg',
      features: featuresArray,
      gradient: gradient || 'bg-gradient-to-br from-blue-400 to-blue-600',
      buttonColor: buttonColor || 'bg-blue-600 hover:bg-blue-700'
    };

    const newVehicle = await Vehicle.create(vehicleData);

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: { vehicle: newVehicle }
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle',
      error: error.message
    });
  }
};

// Update a vehicle
const updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const updateData = req.body;

    // Parse features if provided
    if (updateData.features) {
      if (Array.isArray(updateData.features)) {
        updateData.features = updateData.features.filter(feature => feature && feature.trim());
      } else if (typeof updateData.features === 'string') {
        updateData.features = [updateData.features];
      }
    }

    const updatedVehicle = await Vehicle.update(vehicleId, updateData);

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: { vehicle: updatedVehicle }
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    if (error.message === 'Vehicle not found') {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle',
        error: error.message
      });
    }
  }
};

// Delete a vehicle
const deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    await Vehicle.delete(vehicleId);

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle',
      error: error.message
    });
  }
};

// Update vehicle availability
const updateVehicleAvailability = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { isAvailable } = req.body;

    if (isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Availability status is required'
      });
    }

    const updatedVehicle = await Vehicle.updateAvailability(vehicleId, isAvailable);

    res.status(200).json({
      success: true,
      message: 'Vehicle availability updated successfully',
      data: { vehicle: updatedVehicle }
    });
  } catch (error) {
    console.error('Error updating vehicle availability:', error);
    if (error.message === 'Vehicle not found') {
      res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle availability',
        error: error.message
      });
    }
  }
};

// Search vehicles
const searchVehicles = async (req, res) => {
  try {
    const { q } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const vehicles = await Vehicle.search(q, limit);
    res.status(200).json({
      success: true,
      data: {
        vehicles: vehicles,
        count: vehicles.length,
        searchQuery: q
      }
    });
  } catch (error) {
    console.error('Error searching vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search vehicles',
      error: error.message
    });
  }
};

module.exports = {
  getAllVehicles,
  getAvailableVehicles,
  getVehiclesByPassengerCount,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateVehicleAvailability,
  searchVehicles
};