const User = require('./models/User');
const ParkingSession = require('./models/ParkingSession');
const bcrypt = require('bcryptjs'); // Needed for password hashing even with placeholder User model

const store = {
  async init() {
    console.log('File-based data store initialized.');
  },

  // User operations
  async findUser(query) {
    const user = await User.findOne(query);
    if (user && user.password) {
        // For compatibility with bcrypt.compare in auth routes, we need to ensure the password is a hashed string
        // If the placeholder model directly returns the JSON password, this is fine.
        // If the placeholder model doesn't store hashed passwords, this would be an issue.
        // Given the current revert, the JSON users.json still contains hashed passwords.
        // The placeholder User model's findOne will return the user as is from JSON.
        // The matchPassword method in the placeholder User model is a simplified comparison.
        // For full compatibility with existing auth, we should keep bcrypt.compare in auth.js
        // and ensure the password stored in JSON is indeed hashed.
    }
    return user;
  },

  async createUser(userData) {
    // Hash password before saving, similar to the original User model's pre-save hook
    const salt = await bcrypt.genSalt(10);
    userData.password = await bcrypt.hash(userData.password, salt);
    const newUser = await User.create(userData);
    return newUser;
  },

  async updateUser(id, updates) {
    const user = await User.findById(id);
    if (!user) return null;
    Object.assign(user, updates);
    await user.save();
    return user;
  },

  async deleteUser(id) {
    return User.findByIdAndRemove(id);
  },

  async getAllUsers() {
    return User.find();
  },

  // ParkingSession operations
  async findSession(query) {
    let sessions = await ParkingSession.find(query);
    // Simulate populate 'user' field if needed, for consistency with Mongoose populate
    for (let session of sessions) {
        if (session.user) {
            const user = await User.findById(session.user);
            if (user) {
                session.user = { _id: user._id, email: user.email, role: user.role };
            }
        }
    }
    return sessions;
  },

  async createSession(sessionData) {
    const newSession = await ParkingSession.create(sessionData);
    return newSession;
  },

  async updateSession(id, updates) {
    const session = await ParkingSession.findById(id);
    if (!session) return null;
    Object.assign(session, updates.$set || updates);
    await session.save();
    return session;
  },

  async deleteSession(id) {
    return ParkingSession.findByIdAndRemove(id);
  },

  async getAllSessions() {
    let sessions = await ParkingSession.find();
    // Simulate populate 'user' field
    for (let session of sessions) {
        if (session.user) {
            const user = await User.findById(session.user);
            if (user) {
                session.user = { _id: user._id, email: user.email, role: user.role };
            }
        }
    }
    return sessions;
  },
};

module.exports = store;
