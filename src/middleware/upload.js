const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine upload directory based on file type or route
    if (req.route.path.includes('profile')) {
      uploadPath += 'profiles/';
    } else if (req.route.path.includes('vehicle')) {
      uploadPath += 'vehicles/';
    } else if (req.route.path.includes('documents')) {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'misc/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  // Allowed document types
  const allowedDocTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

  if (req.route.path.includes('documents')) {
    // For document uploads, allow both images and PDFs
    if (allowedDocTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed for documents'), false);
    }
  } else {
    // For other uploads (profile pictures, vehicle photos), only allow images
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF) are allowed'), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.',
      });
    }
  }
  
  if (error.message.includes('Only')) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  
  next(error);
};

// Single file upload middleware
const uploadSingle = (fieldName) => [
  upload.single(fieldName),
  handleMulterError,
];

// Multiple files upload middleware
const uploadMultiple = (fieldName, maxCount = 5) => [
  upload.array(fieldName, maxCount),
  handleMulterError,
];

// Multiple fields upload middleware
const uploadFields = (fields) => [
  upload.fields(fields),
  handleMulterError,
];

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
};