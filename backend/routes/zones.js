const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
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

// @route   GET /api/zones
// @desc    Get all zones (for booking)
// @access  Private (User or Admin)
router.get('/', auth, async (req, res) => {
  try {
    const zones = loadZones();
    res.json(zones);
  } catch (err) {
    console.error('Error in /api/zones:', err);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/zones
// @desc    Create a new zone
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, location, spots, rate, type, status, lat, lng } = req.body;
    if (!name || !location || !spots || !rate || !type) {
      return res.status(400).json({ msg: 'Name, location, spots, rate, and type are required' });
    }
    const zones = loadZones();
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

// @route   PUT /api/zones/:id
// @desc    Update a zone
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
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

// @route   DELETE /api/zones/:id
// @desc    Delete a zone
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
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

module.exports = router;
