const store = require('../dataStore');
const bcrypt = require('bcryptjs');

class UserClass {
  constructor(doc) {
    this.email = doc.email;
    this.password = doc.password;
    this.role = doc.role || 'user';
    this._id = doc._id;
  }

  async save() {
    if (this._id) {
      const updated = await store.updateUser(this._id, {
        email: this.email,
        password: this.password,
        role: this.role,
      });
      if (!updated) return null;
      Object.assign(this, updated);
      return this;
    }
    const existing = await store.findUser({ email: this.email });
    if (existing) {
      return Promise.reject(new Error('User already exists'));
    }
    const user = await store.createUser({
      email: this.email,
      password: this.password,
      role: this.role,
    });
    this._id = user._id;
    return this;
  }
}

UserClass.prototype.id = Object.prototype;

Object.defineProperty(UserClass.prototype, 'id', {
  get() {
    return this._id;
  },
  configurable: true,
});

UserClass.findOne = async function (query) {
  const user = await store.findUser(query);
  if (!user) return null;
  return new UserClass(user);
};

UserClass.find = async function () {
  const users = store.getAllUsers();
  return users.map(u => new UserClass(u));
};

UserClass.findById = async function (id) {
  const user = await store.findUser({ _id: id });
  if (!user) return null;
  return new UserClass(user);
};

UserClass.findByIdAndRemove = async function (id) {
  const deleted = await store.deleteUser(id);
  if (!deleted) return null;
  return new UserClass(deleted);
};

UserClass.findByIdAndUpdate = async function (id, updates, options) {
  const user = await store.updateUser(id, updates);
  if (!user) return null;
  return new UserClass(user);
};

module.exports = UserClass;
