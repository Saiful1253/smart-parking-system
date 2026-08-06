const store = require('../dataStore');

const connectDB = async () => {
  try {
    await store.init();
    console.log('Data store initialized...');
  } catch (err) {
    console.error('Error initializing data store:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
