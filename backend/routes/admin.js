const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const ParkingSession = require('../models/ParkingSession');
const fs = require('fs');
const path = require('path');

const ZONES_FILE = path.join(__dirname, '..', 'data', 'zones.json');

function loadZones() {
  try {
    if (!fs.existsSync(ZONES_FILE)) return [];
    const data = fs.readFileSync(ZONES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading zones:', e);
    return [];
  }
}

function saveZones(zones) {
  try {
    fs.writeFileSync(ZONES_FILE, JSON.stringify(zones, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving zones:', e);
    return false;
  }
}

// @route   GET /api/admin/zones
// @desc    Get all zones with live spot-level occupancy
// @access  Private (Admin)
router.get('/zones', auth, authorize('admin'), async (req, res) => {
  try {
    const sessions = await ParkingSession.find();
    const zones = loadZones();

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

// @route   POST /api/admin/zones
// @desc    Create a new zone
// @access  Private (Admin)
router.post('/zones', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, location, spots, rate, type, status, lat, lng } = req.body;
    if (!name || !location || !spots || !rate || !type) {
      return res.status(400).json({ msg: 'Name, location, spots, rate, and type are required' });
    }
    const zones = loadZones();
    const newId = 'Zone-' + String(zones.length + 1).padStart(2, '0');
    // If IDs exist with gaps, try to find a sensible ID
    const existingIds = zones.map(z => parseInt(z.id.replace('Zone-', ''), 10)).filter(n => !isNaN(n));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const id = 'Zone-' + String(maxId + 1).padStart(2, '0');
    const newZone = {
      id,
      name,
      location,
      spots: parseInt(spots, 10),
      rate: parseFloat(rate),
      type,
      status: status || 'Active',
      lat: parseFloat(lat) || 23.81000,
      lng: parseFloat(lng) || 90.40000
    };
    zones.push(newZone);
    if (!saveZones(zones)) {
      return res.status(500).json({ msg: 'Failed to save zone' });
    }
    res.json(newZone);
  } catch (err) {
    console.error('Error creating zone:', err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/admin/zones/:id
// @desc    Update a zone
// @access  Private (Admin)
router.put('/zones/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const zones = loadZones();
    const index = zones.findIndex(z => z.id === req.params.id);
    if (index === -1) return res.status(404).json({ msg: 'Zone not found' });
    const { name, location, spots, rate, type, status, lat, lng } = req.body;
    if (name) zones[index].name = name;
    if (location) zones[index].location = location;
    if (spots !== undefined) zones[index].spots = parseInt(spots, 10);
    if (rate !== undefined) zones[index].rate = parseFloat(rate);
    if (type) zones[index].type = type;
    if (status) zones[index].status = status;
    if (lat !== undefined) zones[index].lat = parseFloat(lat);
    if (lng !== undefined) zones[index].lng = parseFloat(lng);
    if (!saveZones(zones)) {
      return res.status(500).json({ msg: 'Failed to save zone' });
    }
    res.json(zones[index]);
  } catch (err) {
    console.error('Error updating zone:', err);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/admin/zones/:id
// @desc    Delete a zone
// @access  Private (Admin)
router.delete('/zones/:id', auth, authorize('admin'), async (req, res) => {
  try {
    let zones = loadZones();
    const initialLength = zones.length;
    zones = zones.filter(z => z.id !== req.params.id);
    if (zones.length === initialLength) return res.status(404).json({ msg: 'Zone not found' });
    if (!saveZones(zones)) {
      return res.status(500).json({ msg: 'Failed to save zones' });
    }
    res.json({ msg: 'Zone deleted' });
  } catch (err) {
    console.error('Error deleting zone:', err);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/admin/dashboard-stats
// @desc    Get dashboard statistics including spotted vehicles
// @access  Private (Admin)
router.get('/dashboard-stats', auth, authorize('admin'), async (req, res) => {
  try {
    const sessions = await ParkingSession.find();
    const zones = loadZones();
    const totalZones = zones.length;
    const totalSpots = zones.reduce((sum, z) => sum + (parseInt(z.spots, 10) || 0), 0);
    const activeSessions = sessions.filter(s => s.status === 'Active' || s.status === 'Parked').length;
    const revenue = sessions.reduce((sum, s) => sum + (parseFloat(s.cost || 0)), 0);

    const activeZoneSessions = sessions.filter(s => s.status === 'Active' || s.status === 'Parked');
    const occupied = activeZoneSessions.length;
    const free = Math.max(0, totalSpots - occupied);
    const occupancyRate = totalSpots > 0 ? Math.round((occupied / totalSpots) * 100) : 0;

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
      occupied,
      free,
      occupancyRate,
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

// @route   GET /api/admin/booking-trend
// @desc    Get booking trend data for week/month/year
// @access  Private (Admin)
router.get('/booking-trend', auth, authorize('admin'), async (req, res) => {
  try {
    const period = req.query.period || 'week';
    const sessions = await ParkingSession.find();
    const now = new Date();

    let labels = [];
    let values = [];

    if (period === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      labels = days;
      for (let i = 0; i < 7; i++) {
        const startOfDay = new Date(now);
        startOfDay.setDate(now.getDate() - (6 - i));
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);
        const daySessions = sessions.filter(s => {
          const created = new Date(s.createdAt);
          return created >= startOfDay && created <= endOfDay;
        });
        values.push(daySessions.length);
      }
    } else if (period === 'month') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(currentYear, i, 1);
        const monthEnd = new Date(currentYear, i + 1, 0, 23, 59, 59, 999);
        const monthSessions = sessions.filter(s => {
          const created = new Date(s.createdAt);
          return created >= monthStart && created <= monthEnd;
        });
        labels.push(monthNames[i]);
        values.push(monthSessions.length);
      }
    } else if (period === 'year') {
      const currentYear = now.getFullYear();
      labels = [currentYear.toString()];
      const yearSessions = sessions.filter(s => {
        const created = new Date(s.createdAt);
        return created.getFullYear() === currentYear;
      });
      values.push(yearSessions.length);
    }

    res.json({ period, labels, values });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/zones
// @desc    Get all zones (public - for booking)
// @access  Public
router.get('/public/zones', auth, async (req, res) => {
  try {
    const zones = loadZones();
    res.json(zones);
  } catch (err) {
    console.error('Error in /api/zones:', err);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/users', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
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
router.put(
  '/users/:id/role',
  [auth, authorize('admin'), check('role', 'Role is required').isIn(['user', 'admin'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      user.role = req.body.role;
      await user.save();
      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET /api/admin/anomalies
// @desc    Get live sensor anomalies with vehicle details
// @access  Private (Admin)
router.get('/anomalies', auth, authorize('admin'), async (req, res) => {
  try {
    const sessions = await ParkingSession.find();
    const zones = loadZones();

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

module.exports = router;
