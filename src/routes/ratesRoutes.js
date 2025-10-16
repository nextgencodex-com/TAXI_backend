const express = require('express');
const router = express.Router();
const { getRates, upsertRates, deleteRates } = require('../controllers/ratesController');

// Get current rates
router.get('/', getRates);

// Create or update rates
router.put('/', upsertRates);

// Remove rates
router.delete('/', deleteRates);

module.exports = router;
