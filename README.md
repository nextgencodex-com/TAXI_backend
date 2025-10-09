# Taxi Backend API

A comprehensive Node.js backend for a taxi booking application using Firebase/Firestore as the database.

## Features

- 🔐 **Firebase Authentication** - User registration, login, and secure authentication
- 🚗 **Ride Management** - Create, accept, start, complete, and cancel rides
- 👥 **User Management** - Passenger and driver profiles with role-based access
- 💳 **Payment Processing** - Stripe integration for secure payments
- 🗄️ **Firebase Firestore** - Real-time database for all data storage
- 📍 **Location Services** - Driver location tracking and nearby driver search
- 🛡️ **Security** - JWT tokens, input validation, rate limiting, and middleware
- 📁 **File Upload** - Profile pictures and document upload support
- 🔍 **API Validation** - Comprehensive request validation and error handling

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth + JWT
- **Payment**: Stripe
- **File Upload**: Multer
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
src/
├── config/
│   ├── firebase.js      # Firebase configuration
│   └── index.js         # App configuration
├── controllers/
│   ├── authController.js    # Authentication endpoints
│   ├── userController.js    # User management
│   ├── rideController.js    # Ride management
│   └── paymentController.js # Payment processing
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── authorization.js    # Role-based access control
│   ├── validation.js       # Input validation
│   ├── upload.js           # File upload handling
│   ├── errorHandler.js     # Error handling
│   └── index.js           # Middleware exports
├── models/
│   ├── User.js            # User data model
│   ├── Ride.js            # Ride data model
│   ├── Booking.js         # Booking data model
│   ├── Payment.js         # Payment data model
│   └── index.js           # Model exports
├── routes/
│   ├── authRoutes.js      # Authentication routes
│   ├── userRoutes.js      # User routes
│   ├── rideRoutes.js      # Ride routes
│   ├── paymentRoutes.js   # Payment routes
│   └── index.js           # Route aggregation
├── utils/
│   └── authService.js     # Authentication utilities
├── app.js                 # Express app configuration
└── server.js              # Server startup
```

## Prerequisites

- Node.js (v14 or higher)
- Firebase project with Firestore enabled
- Stripe account (for payments)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Taxi-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and fill in your configuration:
   ```bash
   cp .env.example .env
   ```

   Required environment variables:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-random
   JWT_EXPIRES_IN=7d

   # External Services
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1234567890

   # Email Configuration
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password

   # Payment Configuration
   STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

   # Cloudinary Configuration (optional)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

## Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database
   - Enable Authentication

2. **Generate Service Account Key**
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Use the credentials in your `.env` file

3. **Configure Authentication**
   - Enable Email/Password authentication
   - Enable Phone authentication (optional)

## Running the Application

1. **Development Mode**
   ```bash
   npm run dev
   ```

2. **Production Mode**
   ```bash
   npm start
   ```

3. **Testing**
   ```bash
   npm test
   ```

The server will start on `http://localhost:5000` (or your configured PORT).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/verify-phone` - Verify phone number
- `POST /api/auth/forgot-password` - Send password reset email
- `DELETE /api/auth/account` - Delete user account
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/location` - Update driver location (drivers only)
- `PUT /api/users/online-status` - Update driver online status (drivers only)
- `PUT /api/users/vehicle` - Update vehicle information (drivers only)
- `GET /api/users/nearby-drivers` - Find nearby drivers
- `POST /api/users/profile-picture` - Upload profile picture
- `GET /api/users/stats` - Get user statistics

### Rides
- `POST /api/rides` - Create new ride request
- `GET /api/rides/pending` - Get pending rides (drivers only)
- `POST /api/rides/:rideId/accept` - Accept ride (drivers only)
- `POST /api/rides/:rideId/start` - Start ride (drivers only)
- `POST /api/rides/:rideId/complete` - Complete ride (drivers only)
- `POST /api/rides/:rideId/cancel` - Cancel ride
- `POST /api/rides/:rideId/rate` - Rate completed ride
- `GET /api/rides/history` - Get user's ride history
- `GET /api/rides/:rideId` - Get ride details
- `GET /api/rides/shared` - Find available shared rides
- `POST /api/rides/:rideId/join` - Join shared ride

### Payments
- `POST /api/payments/calculate-fare` - Calculate fare estimate
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/:paymentId/confirm` - Confirm payment
- `GET /api/payments/:paymentId` - Get payment details
- `POST /api/payments/:paymentId/refund` - Process refund
- `GET /api/payments/history` - Get payment history
- `POST /api/payments/webhook/stripe` - Stripe webhook handler

### Health Check
- `GET /api/health` - API health check
- `GET /api/` - API information

## Authentication

The API uses Firebase Authentication combined with JWT tokens:

1. **Registration/Login**: Use Firebase Auth to register/login users
2. **API Access**: Include JWT token in Authorization header:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

## User Roles

- **Passenger**: Can book rides, make payments, rate drivers
- **Driver**: Can accept rides, update location, manage vehicle info
- **Admin**: Full access to all endpoints (future feature)

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error message description",
  "errors": [] // Validation errors if applicable
}
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation for all endpoints
- **Authentication**: JWT tokens with Firebase Auth verification
- **Authorization**: Role-based access control
- **Security Headers**: Helmet.js for security headers
- **CORS**: Configurable cross-origin resource sharing
- **File Upload**: Secure file upload with type and size validation

## Database Structure

### Users Collection
```javascript
{
  id: "user-id",
  email: "user@example.com",
  phoneNumber: "+1234567890",
  firstName: "John",
  lastName: "Doe",
  role: "passenger", // passenger, driver, admin
  isVerified: true,
  isActive: true,
  rating: 4.5,
  totalRides: 25,
  // Driver-specific fields
  licenseNumber: "DL123456",
  vehicleInfo: { make: "Toyota", model: "Camry", ... },
  isOnline: true,
  currentLocation: { latitude: 123.456, longitude: 789.012 }
}
```

### Rides Collection
```javascript
{
  id: "ride-id",
  passengerId: "passenger-id",
  driverId: "driver-id",
  pickupLocation: { latitude: 123.456, longitude: 789.012 },
  destination: { latitude: 123.456, longitude: 789.012 },
  rideType: "standard", // standard, shared, premium, van
  status: "pending", // pending, accepted, in_progress, completed, cancelled
  fare: 25.50,
  paymentMethod: "card",
  createdAt: "timestamp"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@yourcompany.com or create an issue on GitHub.