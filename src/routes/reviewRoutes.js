const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { optionalAuthenticate, authenticate, asyncHandler } = require('../middleware');

// Public create (optional auth)
router.post('/', optionalAuthenticate, asyncHandler(reviewController.createReview));

// List reviews (public)
router.get('/', asyncHandler(reviewController.getReviews));

// Delete (protected)
router.delete('/:reviewId', authenticate, asyncHandler(reviewController.deleteReview));

module.exports = router;
