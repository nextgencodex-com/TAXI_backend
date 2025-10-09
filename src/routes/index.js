// Export all routes
const rideRoutes = require('./authRoutes'); // We renamed authRoutes to contain ride routes
const driverRoutes = require('./driverRoutes');

module.exports = {
  rideRoutes,
  driverRoutes
};