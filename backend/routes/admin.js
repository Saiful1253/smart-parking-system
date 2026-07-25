const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const User = require('../models/User');
const ParkingSession = require('../models/ParkingSession');

// @route   GET /api/admin/zones
// @desc    Get all zones with live spot-level occupancy
// @access  Private (Admin)
router.get('/zones', auth, authorize('admin'), async (req, res) => {
  try {
    const sessions = await ParkingSession.find();
    const zones = [
      { id: 'Zone-A', name: 'Zone A', location: 'Ground Floor, Main Building', spots: 50, rate: 3.50, type: 'Covered', status: 'Active', lat: 23.79400, lng: 90.40400 },
      { id: 'Zone-B', name: 'Zone B', location: 'Rooftop Level 5', spots: 80, rate: 2.00, type: 'Rooftop', status: 'Active', lat: 23.81500, lng: 90.40100 },
      { id: 'Zone-C', name: 'Zone C', location: 'Underground Parking, B1', spots: 120, rate: 5.00, type: 'Underground', status: 'Active', lat: 23.80700, lng: 90.40600 },
      { id: 'Zone-D', name: 'Zone D', location: 'Open Lot, East Wing', spots: 30, rate: 1.50, type: 'Open Air', status: 'Active', lat: 23.81200, lng: 90.41500 },
      { id: 'Zone-E', name: 'Zone E', location: 'West Annex', spots: 40, rate: 2.50, type: 'Covered', status: 'Maintenance', lat: 23.80100, lng: 90.39500 }
    ];

    const zoneSessionsMap = {};
    sessions.forEach(s => {
      if (s.status === 'Active' || s.status === 'Parked') {
        const zoneKey = (s.zone || '').replace('-', ' ');
        if (!zoneSessionsMap[zoneKey]) zoneSessionsMap[zoneKey] = [];
        zoneSessionsMap[zoneKey].push(s);
      }
    });

    const zonesWithOccupancy = zones.map(zone => {
      const zoneKey = zone.id.replace('-', ' ');
      const zoneSessions = zoneSessionsMap[zoneKey] || [];
      const occupied = zoneSessions.length;
      
      // Build per-spot status
      const spotStatus = [];
      const prefix = zone.id.replace('Zone-', '');
      for (let i = 0; i < zone.spots; i++) {
        const spotNum = String(i + 1).padStart(2, '0');
        const spotLabel = prefix + '-' + spotNum;
        const session = zoneSessions.find(s => s.spot === spotLabel);
        spotStatus.push({
          id: spotLabel,
          index: i,
          occupied: !!session,
          plate: session ? session.plateNumber : null,
          sessionId: session ? session._id : null
        });
      }

      return {
        ...zone,
        occupied,
        free: zone.spots - occupied,
        spotStatus
      };
    });

    res.json(zonesWithOccupancy);
  } catch (err) {
    console.error('Error in /api/admin/zones:', err);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/users', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude password from results
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/admin/sessions
// @desc    Get all parking sessions (Admin only)
// @access  Private (Admin)
router.get('/sessions', auth, authorize('admin'), async (req, res) => {
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

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user (Admin only)
// @access  Private (Admin)
router.delete('/users/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await User.findByIdAndRemove(req.params.id);
    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private (Admin)
router.put('/users/:id/role', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.role = req.body.role; // Assuming role is sent in the request body
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   GET /api/admin/anomalies
// @desc    Get live sensor anomalies with vehicle details
// @access  Private (Admin)
router.get('/anomalies', auth, authorize('admin'), async (req, res) => {
  try {
    const sessions = await ParkingSession.find();
    const zones = [
      { id: 'Zone-A', name: 'Zone A', location: 'Ground Floor, Main Building', spots: 50 },
      { id: 'Zone-B', name: 'Zone B', location: 'Rooftop Level 5', spots: 80 },
      { id: 'Zone-C', name: 'Zone C', location: 'Underground Parking, B1', spots: 120 },
      { id: 'Zone-D', name: 'Zone D', location: 'Open Lot, East Wing', spots: 30 },
      { id: 'Zone-E', name: 'Zone E', location: 'West Annex', spots: 40 }
    ];

    const anomalies = [];
    const activeSessions = sessions.filter(s => s.status === 'Active' || s.status === 'Parked');

    zones.forEach(zone => {
      const zoneKey = zone.id.replace('-', ' ');
      const zoneSessions = activeSessions.filter(s => (s.zone || '').replace('-', ' ') === zoneKey);
      const occupied = zoneSessions.length;

      if (occupied > zone.spots) {
        const plates = zoneSessions.map(s => s.plateNumber).join(', ');
        anomalies.push({
          zone: zone.name,
          type: 'overflow',
          message: `${occupied - zone.spots} extra vehicle(s) detected in ${zone.name} (Plates: ${plates}) — capacity exceeded!`,
          severity: 'critical',
          vehicles: zoneSessions.map(s => ({ plate: s.plateNumber, spot: s.spot || 'N/A' }))
        });
      } else if (occupied > 0) {
        const noSensor = zoneSessions.filter(s => s.sensorDetected !== true);
        const unverified = zoneSessions.filter(s => !s.sensorVerified);

        if (noSensor.length > 0 || unverified.length > 0) {
          const plates = zoneSessions.map(s => s.plateNumber).join(', ');
          const spots = zoneSessions.map(s => s.spot || 'N/A').join(', ');
          
          anomalies.push({
            zone: zone.name,
            type: 'sensor_issue',
            message: `${zone.name}: ${noSensor.length} no-sensor, ${unverified.length} unverified (Plates: ${plates}, Spots: ${spots})`,
            severity: 'warning',
            vehicles: zoneSessions.map(s => ({ 
              plate: s.plateNumber, 
              spot: s.spot || 'N/A',
              sensorDetected: s.sensorDetected,
              sensorVerified: s.sensorVerified 
            }))
          });
        }
      }
    });

    res.json({
      count: anomalies.length,
      anomalies
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/admin/anomalies/:id/dismiss
// @desc    Dismiss an anomaly
// @access  Private (Admin)
router.put('/anomalies/:id/dismiss', auth, authorize('admin'), async (req, res) => {
  try {
    res.json({ msg: 'Anomaly dismissed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/admin/dashboard-stats
// @desc    Get dashboard statistics including spotted vehicles
// @access  Private (Admin)
router.get('/dashboard-stats', auth, authorize('admin'), async (req, res) => {
  try {
    const sessions = await ParkingSession.find();
    const totalZones = 5;
    const totalSpots = 320;
    const activeSessions = sessions.filter(s => s.status === 'Active' || s.status === 'Parked').length;
    const revenue = sessions.reduce((sum, s) => sum + (s.cost || 0), 0);

    // Count spotted vehicles (sensor issues)
    const spottedVehicles = sessions.filter(s => {
      if (s.status !== 'Active' && s.status !== 'Parked') return false;
      return s.sensorDetected === false || s.sensorVerified === false;
    });

    const recentSessions = sessions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(s => ({
        id: s._id,
        plate: s.plateNumber,
        zone: s.zone,
        spot: s.spot || 'N/A',
        status: s.status,
        time: new Date(s.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        duration: s.duration || 'Just now'
      }));

    res.json({
      totalZones,
      totalSpots,
      activeSessions,
      revenue: revenue.toFixed(2),
      spottedVehicles: spottedVehicles.length,
      spottedVehiclesList: spottedVehicles.map(s => ({
        plate: s.plateNumber,
        zone: s.zone,
        spot: s.spot || 'N/A',
        sensorDetected: s.sensorDetected,
        sensorVerified: s.sensorVerified
      })),
      recentActivity: recentSessions
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;