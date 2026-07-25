const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables - try multiple paths
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'SmartParkJWTSecret' + Date.now();
if (!process.env.ADMIN_KEY) process.env.ADMIN_KEY = 'SmartParkAdmin' + Date.now();
if (!process.env.PORT) process.env.PORT = '3000';

// CORS: allow frontend origin + API param override
function getAllowedOrigins() {
    const origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'file://',
        'https://saiful1253.github.io',
        'https://saiful1253.github.io/smart-parking-system/'
    ];
    if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL);
    }
    if (process.env.CORS_ORIGIN) {
        origins.push(process.env.CORS_ORIGIN);
    }
    return origins;
}

const app = express();

// CORS middleware - must be before body parsing
// Allow all origins (needed for OAuth/social login and GitHub Pages)
const allowedOrigins = getAllowedOrigins();
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        if (origin.endsWith('.github.io') || origin.includes('.github.io')) {
            return callback(null, true);
        }
        callback(null, true);
    },
    credentials: true
}));

// Handle preflight OPTIONS requests for API routes
app.use((req, res, next) => {
    if (req.method === 'OPTIONS' && req.path.startsWith('/api/')) {
        const origin = req.headers.origin;
        if (origin && (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.github.io') || origin.includes('.github.io'))) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Auth-Token, Accept');
            res.header('Access-Control-Max-Age', '86400');
        }
        res.sendStatus(204);
    } else {
        next();
    }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }); } catch (e) { console.warn('Data dir warning:', e.message); }

// Trust proxies (for rate limiting, IP detection behind load balancers)
app.set('trust proxy', 1);

// Initialize data store on startup
const store = require('./dataStore');
store.init().then(() => console.log('Data store initialized...')).catch(err => { console.error('Data store init error:', err); process.exit(1); });

// Cache control for HTML files
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/') {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..'), {
    maxAge: 0,
    etag: false,
    lastModified: false
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/protected'));
app.use('/api/parking', require('./routes/parking'));
app.use('/api/admin', require('./routes/admin'));

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ msg: 'Server error' });
});

// Start server
const port = parseInt(process.env.PORT, 10) || 3000;
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[SmartPark] Backend listening on http://0.0.0.0:${port}`);
    console.log(`[SmartPark] Serving from: ${__dirname}/..`);
    console.log(`[SmartPark] Data directory: ${dataDir}`);
    console.log(`[SmartPark] CORS origins allowed`, getAllowedOrigins().slice(0, 5).join(', '), (getAllowedOrigins().length > 5 ? ' and more' : ''));
    if (process.env.NODE_ENV === 'production') {
        console.log(`[SmartPark] Running in PRODUCTION mode`);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => { console.log('SIGTERM received'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('SIGINT received'); server.close(() => process.exit(0)); });

module.exports = app;
