const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import configuration
const config = require('./config');

// Import routes
const { rideRoutes, driverRoutes } = require('./routes');
const sharedRideRoutes = require('./routes/sharedRideRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const privateRideRoutes = require('./routes/privateRideRoutes');
const personalRideRoutes = require('./routes/personalRideRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const ratesRoutes = require('./routes/ratesRoutes');

// Import middleware
const { errorHandler, notFound } = require('./middleware');

// Create Express app
const app = express();

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (before main routes)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Taxi Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', rideRoutes);
app.use('/api', driverRoutes);
app.use('/api/shared-rides', sharedRideRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/private-rides', privateRideRoutes);
app.use('/api/personal-rides', personalRideRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/rates', ratesRoutes);

// Catch 404 and forward to error handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err.message);
  console.error('Promise:', promise);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
