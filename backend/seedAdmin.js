const bcrypt = require('bcryptjs');
const store = require('./dataStore');
require('dotenv').config({ path: '../.env' });

async function seedAdmin() {
  await store.init();

  const adminEmail = 'admin@smartpark.com';
  const adminPassword = 'admin123';
  const adminKey = process.env.ADMIN_KEY || 'SmartParkAdmin2024';

  const existing = await store.findUser({ email: adminEmail });
  if (!existing) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await store.createUser({
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });
    console.log('Admin user created:', adminEmail);
  } else {
    console.log('Admin user already exists:', adminEmail);
  }
  console.log('Email:', adminEmail);
  console.log('Password:', adminPassword);
  console.log('Admin Key:', adminKey);
}

seedAdmin().catch(console.error);
