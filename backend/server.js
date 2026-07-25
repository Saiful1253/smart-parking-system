const express = require('express');
const path = require('path');
const dotenv = require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'SmartParkJWTSecret' + Date.now();
if (!process.env.ADMIN_KEY) process.env.ADMIN_KEY = 'SmartParkAdmin' + Date.now();
const connectDB = require('./config/db');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

console.log('ADMIN_KEY:', process.env.ADMIN_KEY ? 'loaded' : 'missing');

connectDB();

app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 'http://127.0.0.1:8080', 'file://'],
    credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});
app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/protected'));
app.use('/api/parking', require('./routes/parking'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
});
