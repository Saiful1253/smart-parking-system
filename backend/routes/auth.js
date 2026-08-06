const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');

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

    if (user.email) {
      const emailResult = await emailService.sendWelcomeEmail(user.email, email);
      if (emailResult && emailResult.skipped) {
        console.warn('Welcome email skipped:', emailResult.reason || 'unknown');
      } else if (emailResult && emailResult.error) {
        console.error('Welcome email failed:', emailResult.error);
      } else {
        console.log('Welcome email sent to:', user.email);
      }
    }

    const payload = {
      user: {
        id: user._id,
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
        id: user._id,
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

// @route   POST /api/auth/google
// @desc    Authenticate with Google OAuth
// @access  Public
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ msg: 'Google credential is required' });

  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase();
    if (!email) return res.status(400).json({ msg: 'Google authentication failed: no email found' });

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        password: await bcrypt.hash('google-oauth-' + Date.now(), 10),
        role: 'customer',
      });
      await user.save();
    }

    const payloadJwt = {
      user: {
        id: user._id,
        role: user.role,
      },
    };

    jwt.sign(
      payloadJwt,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Server error');
        }
        res.json({ token, email, role: user.role, name: payload.name || email.split('@')[0] });
      }
    );
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.status(401).json({ msg: 'Invalid Google token' });
  }
});

router.get('/logout', (req, res) => {
  res.json({ msg: 'Logout successful (token should be removed client-side)' });
});

module.exports = router;