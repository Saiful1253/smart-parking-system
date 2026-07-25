const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ParkingSession = require('../models/ParkingSession');

// @route   POST /api/parking
// @desc    Create a new parking session
// @access  Private (User)
router.post('/', auth, async (req, res) => {
  const { plateNumber, zone, spot, slotIndex, startTime, endTime, cost, payment, paymentStatus, customerNumber, trxId, status, sensorDetected, sensorVerified, sensorType } = req.body;

  try {
    const newSession = new ParkingSession({
      user: req.user.id,
      plateNumber,
      zone,
      spot,
      slotIndex,
      startTime,
      endTime,
      cost,
      payment,
      paymentStatus,
      customerNumber,
      trxId,
      status,
      sensorDetected,
      sensorVerified,
      sensorType,
    });

    const session = await newSession.save();
    res.json(session);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/parking/my-sessions
// @desc    Get all active parking sessions for the logged-in user
// @access  Private (User)
router.get('/my-sessions', auth, async (req, res) => {
  try {
    const sessions = await ParkingSession.find({ user: req.user.id, endTime: { $exists: false } });
    sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/parking/my-history
// @desc    Get all completed parking sessions (history) for the logged-in user
// @access  Private (User)
router.get('/my-history', auth, async (req, res) => {
  try {
    const history = await ParkingSession.find({ user: req.user.id, endTime: { $exists: true } });
    history.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/parking/:id
// @desc    Get a single parking session by ID (only if it belongs to the user or if user is admin)
// @access  Private (User or Admin)
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await ParkingSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ msg: 'Parking session not found' });
    }

    // Check if user owns the session or is an admin
    if (session.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized to view this session' });
    }

    res.json(session);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Parking session not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/parking/:id
// @desc    Update a parking session by ID (only if it belongs to the user or if user is admin)
// @access  Private (User or Admin)
router.put('/:id', auth, async (req, res) => {
  const { plateNumber, zone, startTime, endTime, cost, payment, paymentStatus, customerNumber, trxId, status } = req.body;

  const sessionFields = {};
  if (plateNumber) sessionFields.plateNumber = plateNumber;
  if (zone) sessionFields.zone = zone;
  if (startTime) sessionFields.startTime = startTime;
  if (endTime) sessionFields.endTime = endTime;
  if (cost !== undefined) sessionFields.cost = cost;
  if (payment) sessionFields.payment = payment;
  if (paymentStatus) sessionFields.paymentStatus = paymentStatus;
  if (customerNumber) sessionFields.customerNumber = customerNumber;
  if (trxId) sessionFields.trxId = trxId;
  if (status) sessionFields.status = status;

  try {
    let session = await ParkingSession.findById(req.params.id);

    if (!session) return res.status(404).json({ msg: 'Parking session not found' });

    // Check if user owns the session or is an admin
    if (session.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized to update this session' });
    }

    session = await ParkingSession.findByIdAndUpdate(
      req.params.id,
      { $set: sessionFields },
      { new: true }
    );

    res.json(session);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Parking session not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/parking/:id
// @desc    Delete a parking session by ID (only if it belongs to the user or if user is admin)
// @access  Private (User or Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await ParkingSession.findById(req.params.id);

    if (!session) return res.status(404).json({ msg: 'Parking session not found' });

    // Check if user owns the session or is an admin
    if (session.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Not authorized to delete this session' });
    }

    await ParkingSession.findByIdAndRemove(req.params.id);

    res.json({ msg: 'Parking session removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Parking session not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/parking/all-sessions
// @desc    Get all parking sessions (Admin only)
// @access  Private (Admin)
router.get('/all-sessions', auth, authorize('admin'), async (req, res) => {
  try {
    const sessions = await ParkingSession.find();
    for (const session of sessions) {
      const user = await User.findById(session.user);
      if (user) {
        session.user = { _id: user._id, email: user.email };
      }
    }
    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;