// Placeholder for User model (file-based storage is active)
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

class User {
  static async findOne(query) {
    const users = await readFile('users.json');
    if (query.email) {
      return users.find(u => u.email === query.email) || null;
    }
    return null;
  }

  static async findById(id) {
    const users = await readFile('users.json');
    return users.find(u => u._id === id) || null;
  }

  static async create(userData) {
    const users = await readFile('users.json');
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const newUser = { _id: newId, createdAt: new Date().toISOString(), ...userData };
    users.push(newUser);
    await writeFile('users.json', users);
    return newUser;
  }

  static async findByIdAndRemove(id) {
    const users = await readFile('users.json');
    const initialLength = users.length;
    const updatedUsers = users.filter(u => u._id !== id);
    if (updatedUsers.length < initialLength) {
      await writeFile('users.json', updatedUsers);
      return { _id: id }; // Indicate success
    }
    return null;
  }

  static async find() {
    return readFile('users.json');
  }

  constructor(data) {
    this._id = data._id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 9));
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'user';
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  async save() {
    const users = await readFile('users.json');
    const existingIndex = users.findIndex(u => u._id === this._id);
    if (existingIndex > -1) {
      users[existingIndex] = { ...users[existingIndex], ...this };
    } else {
      users.push(this);
    }
    await writeFile('users.json', users);
    return this;
  }

  async matchPassword(enteredPassword) {
    // This is a simplified comparison for file-based storage without bcrypt
    // In a real app, you'd hash passwords
    return enteredPassword === this.password;
  }
}

module.exports = User;
