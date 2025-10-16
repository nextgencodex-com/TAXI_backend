const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Admin SDK configuration
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

// Get Firestore database instance
const db = admin.firestore();
// Configure Firestore to ignore undefined properties so writes won't fail when
// objects contain undefined fields. This is safe for our simplified backend.
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // Some older SDKs or emulators may not support settings; ignore errors.
  console.warn('Could not apply Firestore settings:', e.message || e);
}

// Get Firebase Auth instance
const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth
};