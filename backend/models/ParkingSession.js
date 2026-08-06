// Placeholder for ParkingSession model (file-based storage is active)
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');

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

class ParkingSession {
  static async find(query = {}) {
    let sessions = await readFile('sessions.json');
    
    if (query.user) {
      sessions = sessions.filter(s => s.user === query.user);
    }
    if (query.endTime && query.endTime.$exists !== undefined) {
      if (query.endTime.$exists === false) {
        sessions = sessions.filter(s => !s.endTime);
      } else if (query.endTime.$exists === true) {
        sessions = sessions.filter(s => s.endTime);
      }
    }
    // Simulate populate 'user' field for compatibility with routes
    for (let session of sessions) {
      // In a real file-based scenario, you'd fetch user details here
      // For now, we'll just keep the user ID
    }
    return sessions;
  }

  static async findById(id) {
    const sessions = await readFile('sessions.json');
    return sessions.find(s => s._id === id) || null;
  }

  static async create(sessionData) {
    const sessions = await readFile('sessions.json');
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const newSession = { _id: newId, createdAt: new Date().toISOString(), ...sessionData };
    sessions.push(newSession);
    await writeFile('sessions.json', sessions);
    return newSession;
  }

  static async findByIdAndUpdate(id, updates, options) {
    let sessions = await readFile('sessions.json');
    const index = sessions.findIndex(s => s._id === id);
    if (index === -1) return null;

    let updatedSession = { ...sessions[index], ...(updates.$set || updates) };
    sessions[index] = updatedSession;
    await writeFile('sessions.json', sessions);
    return options && options.new ? updatedSession : sessions[index];
  }

  static async findByIdAndRemove(id) {
    let sessions = await readFile('sessions.json');
    const initialLength = sessions.length;
    const updatedSessions = sessions.filter(s => s._id !== id);
    if (updatedSessions.length < initialLength) {
      await writeFile('sessions.json', updatedSessions);
      return { _id: id }; // Indicate success
    }
    return null;
  }

  constructor(data) {
    this._id = data._id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 9));
    this.user = data.user;
    this.plateNumber = data.plateNumber;
    this.zone = data.zone;
    this.spot = data.spot;
    this.slotIndex = data.slotIndex;
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime;
    this.cost = data.cost || 0;
    this.payment = data.payment || 'Cash';
    this.paymentStatus = data.paymentStatus || 'Pending';
    this.status = data.status || 'Active';
    this.sensorDetected = data.sensorDetected || false;
    this.sensorVerified = data.sensorVerified || false;
    this.sensorType = data.sensorType;
    this.bookingType = data.bookingType || 'fixed';
    this.durationHours = data.durationHours || 1;
    this.vehicleType = data.vehicleType || 'Car';
    this.evCharger = data.evCharger || false;
    this.chargingDuration = data.chargingDuration || 0;
    this.chargingCost = data.chargingCost || 0;
    this.createdAt = data.createdAt || new Date();
  }

  async save() {
    const sessions = await readFile('sessions.json');
    const existingIndex = sessions.findIndex(s => s._id === this._id);
    if (existingIndex > -1) {
      sessions[existingIndex] = { ...sessions[existingIndex], ...this };
    } else {
      sessions.push(this);
    }
    await writeFile('sessions.json', sessions);
    return this;
  }
}

module.exports = ParkingSession;