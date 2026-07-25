const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

async function readFile(filename) {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeFile(filename, data) {
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

const store = {
  users: [],
  sessions: [],

  async init() {
    await ensureDataDir();
    this.users = await readFile('users.json');
    this.sessions = await readFile('sessions.json');
  },

  async saveUsers() {
    await writeFile('users.json', this.users);
  },

  async saveSessions() {
    await writeFile('sessions.json', this.sessions);
  },

  // User operations
  async findUser(query) {
    if (query.email) {
      return this.users.find(u => u.email === query.email) || null;
    }
    if (query._id) {
      return this.users.find(u => u._id === query._id) || null;
    }
    return null;
  },

  async createUser(user) {
    user._id = generateId();
    user.createdAt = new Date().toISOString();
    this.users.push(user);
    await this.saveUsers();
    return user;
  },

  async updateUser(id, updates) {
    const idx = this.users.findIndex(u => u._id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates };
    await this.saveUsers();
    return this.users[idx];
  },

  async deleteUser(id) {
    const idx = this.users.findIndex(u => u._id === id);
    if (idx === -1) return null;
    const deleted = this.users.splice(idx, 1)[0];
    await this.saveUsers();
    return deleted;
  },

  getAllUsers() {
    return this.users.map(u => ({ ...u }));
  },

  // ParkingSession operations
  async findSession(query) {
    if (query._id) {
      return this.sessions.find(s => s._id === query._id) || null;
    }
    if (query.user && query.endTime) {
      if (query.endTime.$exists === false) {
        return this.sessions.filter(s => s.user === query.user && !s.endTime);
      }
      if (query.endTime.$exists === true) {
        return this.sessions.filter(s => s.user === query.user && s.endTime);
      }
    }
    if (query.user) {
      return this.sessions.filter(s => s.user === query.user);
    }
    return this.sessions;
  },

  async createSession(session) {
    session._id = generateId();
    session.createdAt = new Date().toISOString();
    this.sessions.push(session);
    await this.saveSessions();
    return session;
  },

  async updateSession(id, updates) {
    const idx = this.sessions.findIndex(s => s._id === id);
    if (idx === -1) return null;
    if (updates.$set) {
      this.sessions[idx] = { ...this.sessions[idx], ...updates.$set };
    } else {
      this.sessions[idx] = { ...this.sessions[idx], ...updates };
    }
    await this.saveSessions();
    return this.sessions[idx];
  },

  async deleteSession(id) {
    const idx = this.sessions.findIndex(s => s._id === id);
    if (idx === -1) return null;
    const deleted = this.sessions.splice(idx, 1)[0];
    await this.saveSessions();
    return deleted;
  },

  getAllSessions() {
    return this.sessions.map(s => ({ ...s }));
  },
};

module.exports = store;
