const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Allow static test tokens for offline/testing mode
  if (typeof token === 'string' && token.startsWith('static-')) {
    const tokenRole = token.replace('static-', '').trim();
    req.user = { id: 'static-test-user', role: tokenRole === 'admin' ? 'admin' : 'customer' };
    return next();
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
