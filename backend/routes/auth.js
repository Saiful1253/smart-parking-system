const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      email,
      password,
      role,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Server error');
        }
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // If admin login requested, validate admin key
    const requestedRole = role || user.role;
    if (requestedRole === 'admin') {
      const adminKey = String(req.body.adminKey || '');
      const validAdminKey = String(process.env.ADMIN_KEY || '');
      if (adminKey !== validAdminKey) {
        return res.status(403).json({ msg: 'Invalid admin credentials' });
      }
    }

    const payload = {
      user: {
        id: user.id,
        role: requestedRole,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Server error');
        }
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth/logout (This would typically be handled on the client-side by deleting the token)
// @desc    Logout user (client-side token removal)
// @access  Public
router.get('/logout', (req, res) => {
  res.json({ msg: 'Logout successful (token should be removed client-side)' });
});


module.exports = router;