const { db } = require('../config/firebase');

const SETTINGS_COLLECTION = 'settings';
const RATES_DOC = 'rates';

exports.getRates = async (req, res) => {
  try {
    const doc = await db.collection(SETTINGS_COLLECTION).doc(RATES_DOC).get();
    if (!doc.exists) {
      return res.json({ success: true, data: { rates: null } });
    }
    return res.json({ success: true, data: { rates: doc.data() } });
  } catch (err) {
    console.error('Failed to get rates:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch rates' });
  }
};

exports.upsertRates = async (req, res) => {
  try {
    const { ratePerKm, rateLKRPerKm, exchangeRate } = req.body || {};

    // Basic validation, coerce to numbers when possible
    const usd = typeof ratePerKm === 'number' ? ratePerKm : (typeof ratePerKm === 'string' ? parseFloat(ratePerKm) : NaN);
    const lkr = typeof rateLKRPerKm === 'number' ? rateLKRPerKm : (typeof rateLKRPerKm === 'string' ? parseFloat(rateLKRPerKm) : NaN);
    const exch = typeof exchangeRate === 'number' ? exchangeRate : (typeof exchangeRate === 'string' ? parseFloat(exchangeRate) : NaN);

    if (isNaN(usd) || usd <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid ratePerKm' });
    }

    const dataToSave = {
      ratePerKm: usd,
      rateLKRPerKm: !isNaN(lkr) && lkr > 0 ? lkr : Math.round(usd * (isNaN(exch) ? 330 : exch) * 100) / 100,
      exchangeRate: !isNaN(exch) && exch > 0 ? exch : (isNaN(lkr) || lkr === 0 ? 330 : (lkr / usd)),
      updatedAt: new Date().toISOString(),
    };

    await db.collection(SETTINGS_COLLECTION).doc(RATES_DOC).set(dataToSave, { merge: true });

    return res.json({ success: true, data: { rates: dataToSave } });
  } catch (err) {
    console.error('Failed to upsert rates:', err);
    return res.status(500).json({ success: false, message: 'Failed to save rates' });
  }
};

exports.deleteRates = async (req, res) => {
  try {
    await db.collection(SETTINGS_COLLECTION).doc(RATES_DOC).delete();
    return res.json({ success: true, message: 'Rates removed' });
  } catch (err) {
    console.error('Failed to delete rates:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete rates' });
  }
};
