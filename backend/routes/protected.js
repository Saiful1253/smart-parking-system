const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// @route   GET /api/protected
// @desc    A protected route for all authenticated users
// @access  Private
router.get('/protected', auth, (req, res) => {
  res.json({ msg: `Welcome user ${req.user.id}, your role is ${req.user.role}` });
});

// @route   GET /api/admin
// @desc    A protected route for admin users only
// @access  Private (Admin)
router.get('/admin', auth, authorize('admin'), (req, res) => {
  res.json({ msg: `Welcome admin ${req.user.id}` });
});

module.exports = router;