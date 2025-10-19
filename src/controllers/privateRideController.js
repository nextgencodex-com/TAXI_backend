const { db } = require('../config/firebase');
const { Ride, User, Booking } = require('../models');

/**
 * Controller for Private Rides (rideType === 'private')
 */
const createPrivateRide = async (req, res) => {
  try {
    const raw = req.body || {};
    console.log('Received private ride payload:', JSON.stringify(raw).slice(0, 1000));

    // Helper to safely read nested values with fallback order
    const pick = (...paths) => {
      for (const p of paths) {
        if (p == null) continue;
        // If path is a string property name, check raw[p]
        if (typeof p === 'string') {
          const v = raw[p];
          if (v !== undefined && v !== null) return v;
        }
        // If path is an array like ['passenger','name'] walk it
        if (Array.isArray(p)) {
          let cur = raw;
          let ok = true;
          for (const key of p) {
            if (cur && (key in cur)) cur = cur[key];
            else { ok = false; break; }
          }
          if (ok && cur !== undefined && cur !== null) return cur;
        }
      }
      return undefined;
    };

  const passengerName = pick('passengerName', ['passenger', 'name'], ['passenger', 'fullName']);
  const passengerPhone = pick('passengerPhone', ['passenger', 'phone'], ['passenger', 'phoneNumber']);
  const passengerEmail = pick('passengerEmail', ['passenger', 'email'], ['personalData', 'email']);
    const pickupLocation = pick('pickupLocation', ['pickup', 'location'], ['pickup', 'coords'], 'pickupLocation');
    const destination = pick('destination', ['destination', 'location'], ['destination', 'coords'], 'destination');
    const pickupAddress = pick('pickupAddress', ['pickup', 'address']);
    const destinationAddress = pick('destinationAddress', ['destination', 'address']);
  const bookingDate = pick('bookingDate', ['booking', 'date'], 'scheduledTime');
  const vehicleName = pick('vehicle', 'vehicleName', ['vehicle', 'name']);
    const passengers = pick('passengers', ['passenger', 'count'], ['passengers']);
    const notes = pick('notes', ['meta', 'notes'], 'notes');

    // No validation: accept and store all incoming data, even if fields are missing or empty

    // Find or create passenger
    let passenger = await User.findByPhoneNumber(passengerPhone);
    if (!passenger) {
      passenger = await User.create({ name: passengerName, phoneNumber: passengerPhone, email: passengerEmail || undefined, role: 'passenger' });
    } else {
      // Always save the submitted email in the ride, even if user already exists
      if (passengerEmail && !passenger.email) {
        // Best-effort update of email on existing user if it's missing
        try {
          await db.collection('users').doc(passenger.id).update({ email: passengerEmail });
          passenger.email = passengerEmail;
        } catch (e) {
          console.warn('Could not update passenger email:', e?.message || String(e));
        }
      }
    }

    // Build ride payload and force rideType to 'private'
    // Persist ride with core fields but also attach the raw frontend payload
    // so clients/admins can inspect any extra fields that were sent.
    // Parse booking date into Date if possible
    const parseDate = (v) => {
      try {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      } catch { return null; }
    };

    const ridePayload = {
      passengerId: passenger.id,
      pickupLocation,
      destination,
      pickupAddress: pickupAddress || '',
      destinationAddress: destinationAddress || '',
      rideType: 'private',
      passengers: Number(passengers) || 1,
      notes: notes || '',
      // Persist entered customer-facing fields for admin/UI convenience
      customerName: passengerName,
      customerPhone: passengerPhone,
      customerEmail: passengerEmail || '',
      vehicle: vehicleName || '',
      scheduledTime: parseDate(bookingDate) || bookingDate || null,
      // meta/rawPayload is optional on the Ride model but useful to keep
      rawPayload: raw,
    };

  // Remove undefined values from payload to be safe
  const sanitized = {};
  Object.entries(ridePayload).forEach(([k, v]) => { if (v !== undefined) sanitized[k] = v; });

  const ride = await Ride.create(sanitized);

    // Create booking entry for the ride
    const booking = await Booking.create({
      rideId: ride.id,
      passengerId: passenger.id,
      bookingType: (sanitized.scheduledTime ? 'scheduled' : 'immediate'),
    });
    const customer = {
      fullName: passengerName,
      email: passenger.email || passengerEmail || '',
      phone: passengerPhone,
    };

    res.status(201).json({ success: true, message: 'Private ride created', data: { ride, booking, passenger, customer } });
  } catch (error) {
    console.error('Error creating private ride:', error);
    res.status(500).json({ success: false, message: 'Failed to create private ride', error: error.message });
  }
};

const getAllPrivateRides = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const snapshot = await db.collection('rides')
      .where('rideType', '==', 'private')
      .limit(parseInt(limit))
      .get();

    const rides = [];
    snapshot.forEach(doc => rides.push(new Ride({ id: doc.id, ...doc.data() })));

    // For each ride, attach customer details (best-effort)
    const ridesWithCustomer = await Promise.all(rides.map(async (ride) => {
      try {
        // Always check all possible sources for customer details
        const raw = (ride.rawPayload || {});
        const pd = raw.personalData || {};
        const pg = raw.passenger || {};


        // Always prefer the email from the ride payload if present
        let fullName = ride.customerName || pd.fullName || pg.name || pg.fullName || raw.passengerName || raw.customerName || 'N/A';
        let email = ride.customerEmail || raw.passengerEmail || pd.email || pg.email || raw.customerEmail || raw.email || (raw.passenger && raw.passenger.email) || 'N/A';
        let phone = ride.customerPhone || pd.phone || pg.phone || pg.phoneNumber || raw.passengerPhone || raw.customerPhone || raw.phone || (raw.passenger && raw.passenger.phone) || (raw.passenger && raw.passenger.phoneNumber) || 'N/A';

        // Only use user record for missing name/phone, never override email from payload
        if (ride.passengerId) {
          const u = await User.findById(ride.passengerId);
          if (u) {
            fullName = fullName !== 'N/A' ? fullName : (u.name || 'N/A');
            phone = phone !== 'N/A' ? phone : (u.phoneNumber || 'N/A');
          }
        }

        return {
          ...ride,
          customer: { fullName, email, phone },
        };
      } catch (e) {
        return {
          ...ride,
          customer: { fullName: 'N/A', email: 'N/A', phone: 'N/A' },
        };
      }
    }));

    // Sort in descending order by createdAt. Support Firestore Timestamp objects
    // (which have toDate()) as well as Date/string values.
    const parseTime = (v) => {
      try {
        if (!v) return 0;
        if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate().getTime();
        const t = new Date(v).getTime();
        return Number.isFinite(t) ? t : 0;
      } catch {
        return 0;
      }
    };

    ridesWithCustomer.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));
    res.json({ success: true, data: { rides: ridesWithCustomer, count: ridesWithCustomer.length } });
  } catch (error) {
    console.error('Error fetching private rides:', error);
    // Firestore returns a helpful message with an index creation URL when a composite index is required.
    // Detect that case and return the URL to the caller so the index can be created easily.
    const msg = (error && error.message) ? error.message : String(error);
    // Try to extract the console URL from the error message
    const urlMatch = msg.match(/https:\/\/console\.firebase\.google\.com\/[\S]+create_composite=[^\s)]+/);
    const indexUrl = urlMatch ? urlMatch[0] : null;

    if (msg.includes('FAILED_PRECONDITION') && indexUrl) {
      return res.status(412).json({ success: false, message: 'Firestore index required for this query', indexUrl, error: msg });
    }

    res.status(500).json({ success: false, message: 'Failed to fetch private rides', error: msg });
  }
};

const updatePrivateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updateData = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    if (ride.rideType !== 'private') {
      return res.status(400).json({ success: false, message: 'Ride is not a private ride' });
    }

    const updated = await ride.update(updateData);
    res.json({ success: true, message: 'Private ride updated', data: { ride: updated } });
  } catch (error) {
    console.error('Error updating private ride:', error);
    res.status(500).json({ success: false, message: 'Failed to update private ride', error: error.message });
  }
};

const deletePrivateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    if (ride.rideType !== 'private') {
      return res.status(400).json({ success: false, message: 'Ride is not a private ride' });
    }

    // Remove ride document
    await db.collection('rides').doc(rideId).delete();

    // Also remove associated booking if exists
    try {
      const booking = await Booking.findByRideId(rideId);
      if (booking) await db.collection('bookings').doc(booking.id).delete();
    } catch (bErr) {
      console.warn('Could not remove booking for deleted ride:', bErr.message);
    }

    res.json({ success: true, message: 'Private ride deleted' });
  } catch (error) {
    console.error('Error deleting private ride:', error);
    res.status(500).json({ success: false, message: 'Failed to delete private ride', error: error.message });
  }
};

module.exports = {
  createPrivateRide,
  getAllPrivateRides,
  updatePrivateRide,
  deletePrivateRide,
};
