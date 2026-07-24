const store = require('../dataStore');

class ParkingSessionClass {
  constructor(doc) {
    this.user = doc.user;
    this.plateNumber = doc.plateNumber;
    this.zone = doc.zone;
    this.startTime = doc.startTime || new Date();
    this.endTime = doc.endTime;
    this.cost = doc.cost || 0;
    this.payment = doc.payment || 'Cash';
    this.paymentStatus = doc.paymentStatus || 'Paid';
    this.customerNumber = doc.customerNumber;
    this.trxId = doc.trxId;
    this.bookingType = doc.bookingType;
    this.meterRate = doc.meterRate;
    this.meterSeconds = doc.meterSeconds;
    this.createdAt = doc.createdAt;
    this.status = doc.status || 'Active';
    this._id = doc._id;
    this.id = doc._id;
  }

  async save() {
    const session = await store.createSession({
      user: this.user,
      plateNumber: this.plateNumber,
      zone: this.zone,
      startTime: this.startTime,
      endTime: this.endTime,
      cost: this.cost,
      payment: this.payment,
      paymentStatus: this.paymentStatus,
      customerNumber: this.customerNumber,
      trxId: this.trxId,
      status: this.status || 'Active',
    });
    this._id = session._id;
    return this;
  }
}

ParkingSessionClass.find = async function (query) {
  let sessions = store.getAllSessions();

  if (query.user) {
    sessions = sessions.filter(s => s.user === query.user);
  }

  if (query.endTime) {
    if (query.endTime.$exists === false) {
      sessions = sessions.filter(s => !s.endTime);
    } else if (query.endTime.$exists === true) {
      sessions = sessions.filter(s => s.endTime);
    }
  }

  return sessions.map(s => new ParkingSessionClass(s));
};

ParkingSessionClass.findById = async function (id) {
  const session = await store.findSession({ _id: id });
  if (!session) return null;
  return new ParkingSessionClass(session);
};

ParkingSessionClass.findByIdAndUpdate = async function (id, updates, options) {
  const session = await store.updateSession(id, updates);
  if (!session) return null;
  return new ParkingSessionClass(session);
};

ParkingSessionClass.findByIdAndRemove = async function (id) {
  const deleted = await store.deleteSession(id);
  if (!deleted) return null;
  return new ParkingSessionClass(deleted);
};

ParkingSessionClass.prototype.populate = async function (path, select) {
  if (path === 'user' && this.user) {
    const user = await store.findUser({ _id: this.user });
    if (user) {
      this.user = select ? { _id: user._id, email: user.email } : user;
    }
  }
  return this;
};

module.exports = ParkingSessionClass;
