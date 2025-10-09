const app = require('./app');
const config = require('./config');
const { admin } = require('./config/firebase');

// Verify Firebase connection
const verifyFirebaseConnection = async () => {
  try {
    // Test Firestore connection
    const db = admin.firestore();
    await db.collection('_test').doc('_test').set({ timestamp: new Date() });
    await db.collection('_test').doc('_test').delete();
    console.log('✅ Firestore database connected successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    
    if (error.code === 'auth/invalid-credential') {
      console.error('Please check your Firebase service account credentials in the .env file');
    }
    
    return false;
  }
};

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Simple Taxi Backend Server...');
    console.log(`Environment: ${config.nodeEnv}`);
    
    // Verify Firebase connection
    const firebaseConnected = await verifyFirebaseConnection();
    if (!firebaseConnected) {
      console.error('❌ Server startup failed: Firebase connection error');
      process.exit(1);
    }
    
    // Start the server
    const server = app.listen(config.port, () => {
      console.log(`\n🎉 Server is running successfully!`);
      console.log(`📍 Server URL: http://localhost:${config.port}`);
      console.log(`📍 API Base URL: http://localhost:${config.port}/api`);
      console.log(`\n📚 Available Endpoints:`);
      console.log(`   Rides: http://localhost:${config.port}/api/rides`);
      console.log(`   Drivers: http://localhost:${config.port}/api/drivers`);
      console.log(`\n🔧 Configuration:`);
      console.log(`   Node Environment: ${config.nodeEnv}`);
      console.log(`   Firebase Project: ${config.firebase.projectId || 'Not configured'}`);
      console.log(`   CORS Origins: ${config.cors.allowedOrigins.join(', ')}`);
      console.log(`\n⚠️  Note: This is a simplified backend without authentication`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

// Check minimum environment variables
const checkEnvironment = () => {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file and ensure Firebase variables are set.');
    process.exit(1);
  }
};

// Run startup checks and start server
checkEnvironment();
startServer();
