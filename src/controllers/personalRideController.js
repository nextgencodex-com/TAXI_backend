const { db } = require('../config/firebase');
const { User, Booking } = require('../models');

const createPersonalRide = async (req, res) => {
  try {
    const raw = req.body || {};

    const findPhone = () => {
      if (!raw) return null;
      if (typeof raw.phone === 'string' && raw.phone.trim()) return raw.phone.trim();
      if (raw.passenger && typeof raw.passenger.phone === 'string' && raw.passenger.phone.trim()) return raw.passenger.phone.trim();
      if (typeof raw.passengerPhone === 'string' && raw.passengerPhone.trim()) return raw.passengerPhone.trim();
      if (raw.contact && typeof raw.contact.phone === 'string' && raw.contact.phone.trim()) return raw.contact.phone.trim();
      return null;
    };

    const passengerPhone = findPhone();
    let passenger = null;
    try {
      if (passengerPhone) {
        passenger = await User.findByPhoneNumber(passengerPhone);
        if (!passenger && raw.passenger && (raw.passenger.name || raw.passenger.fullName)) {
          passenger = await User.create({ name: raw.passenger.name || raw.passenger.fullName, phoneNumber: passengerPhone, role: 'passenger' });
        }
      }
    } catch (e) {
      console.warn('Passenger find/create failed; continuing to store ride:', e && e.message ? e.message : e);
    }

    const ridePayload = {
      rideType: raw.rideType || 'personal',
      passengerId: passenger ? passenger.id : (raw.passengerId || raw.passenger?.id || null),
      rawPayload: raw,
      pickupLocation: raw.pickup?.location || raw.pickupLocation || null,
      destination: raw.destination?.location || raw.destination || null,
      notes: raw.notes || raw.meta?.notes || null,
      createdAt: new Date(),
    };

    const sanitized = {};
    Object.entries(ridePayload).forEach(([k, v]) => { if (v !== undefined) sanitized[k] = v; });

    // Persist into a dedicated collection for personal bookings
    const docRef = await db.collection('personalbooking').add(sanitized);
    const createdDoc = { id: docRef.id, ...sanitized };

    // Optionally create a booking record that references this personal booking
    let booking = null;
    try {
      if (docRef.id && passenger) {
        booking = await Booking.create({ rideId: docRef.id, passengerId: passenger.id, bookingType: 'immediate' });
      }
    } catch (bErr) {
      console.warn('Could not create booking for personalbooking', docRef.id, bErr && bErr.message ? bErr.message : bErr);
    }

    const rideResponse = { ...createdDoc };
    if (passenger) {
      rideResponse.customer = {
        id: passenger.id,
        fullName: passenger.name || '',
        email: passenger.email || null,
        phone: passenger.phoneNumber || null,
      };
    }

    res.status(201).json({ success: true, message: 'Personal booking created', data: { bookingRecord: booking, personalBooking: rideResponse, passenger } });
  } catch (error) {
    console.error('Error creating personal ride:', error);
    res.status(500).json({ success: false, message: 'Failed to create personal ride', error: error.message });
  }
};

const getAllPersonalRides = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const snapshot = await db.collection('personalbooking')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const bookings = [];
    snapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: { bookings, count: bookings.length } });
  } catch (error) {
    console.error('Error fetching personal rides:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch personal rides', error: error.message });
  }
};

const updatePersonalRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const updateData = req.body;

    const docRef = db.collection('personalbooking').doc(rideId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Personal booking not found' });

    await docRef.update({ ...updateData, updatedAt: new Date() });
    const updatedDoc = (await docRef.get()).data();
    res.json({ success: true, message: 'Personal booking updated', data: { booking: { id: rideId, ...updatedDoc } } });
  } catch (error) {
    console.error('Error updating personal ride:', error);
    res.status(500).json({ success: false, message: 'Failed to update personal ride', error: error.message });
  }
};

const deletePersonalRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const docRef = db.collection('personalbooking').doc(rideId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Personal booking not found' });

    await docRef.delete();

    try {
      const booking = await Booking.findByRideId(rideId);
      if (booking) await db.collection('bookings').doc(booking.id).delete();
    } catch (bErr) {
      console.warn('Could not remove booking for deleted personal booking:', bErr.message);
    }

    res.json({ success: true, message: 'Personal booking deleted' });
  } catch (error) {
    console.error('Error deleting personal ride:', error);
    res.status(500).json({ success: false, message: 'Failed to delete personal ride', error: error.message });
  }
};

module.exports = {
  createPersonalRide,
  getAllPersonalRides,
  updatePersonalRide,
  deletePersonalRide,
};

