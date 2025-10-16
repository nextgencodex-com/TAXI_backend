const { db } = require('../config/firebase');

// Create a new review
const createReview = async (req, res) => {
  try {
    // Persist the entire payload coming from the frontend so no fields are lost.
    // We'll attach an id and createdAt, and remove undefined values before
    // writing to Firestore.
    const raw = req.body || {};

    const docRef = db.collection('reviews').doc();
    const review = {
      id: docRef.id,
      ...raw,
      createdAt: new Date(),
    };

    // Sanitize undefined properties (Firestore rejects undefined values)
    const sanitized = {};
    Object.entries(review).forEach(([k, v]) => { if (v !== undefined) sanitized[k] = v; });

    await docRef.set(sanitized);
    res.status(201).json({ success: true, data: sanitized });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Failed to create review', error: error.message });
  }
};

// Get all reviews (optionally filter by rideId)
const getReviews = async (req, res) => {
  try {
    const { rideId, limit = 100 } = req.query;
    let query = db.collection('reviews').orderBy('createdAt', 'desc').limit(parseInt(limit, 10));

    if (rideId) query = query.where('rideId', '==', rideId);

    const snapshot = await query.get();
    const reviews = [];
    snapshot.forEach(doc => reviews.push(doc.data()));

    res.json({ success: true, data: { reviews, count: reviews.length } });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews', error: error.message });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const doc = db.collection('reviews').doc(reviewId);
    const snapshot = await doc.get();
    if (!snapshot.exists) return res.status(404).json({ success: false, message: 'Review not found' });

    await doc.delete();
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review', error: error.message });
  }
};

module.exports = {
  createReview,
  getReviews,
  deleteReview,
};
