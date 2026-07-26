const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const crypto = require('crypto');

// Load environment variables - try multiple paths
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) {
    const jwtSecretFile = path.join(__dirname, '.secret');
    try {
        if (fs.existsSync(jwtSecretFile)) {
            process.env.JWT_SECRET = fs.readFileSync(jwtSecretFile, 'utf8').trim();
        } else {
            process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
            fs.writeFileSync(jwtSecretFile, process.env.JWT_SECRET);
        }
    } catch(e) {
        process.env.JWT_SECRET = 'SmartParkJWTSecret' + Date.now();
    }
}
if (!process.env.ADMIN_KEY) {
    const adminKeyFile = path.join(__dirname, '.adminkey');
    try {
        if (fs.existsSync(adminKeyFile)) {
            process.env.ADMIN_KEY = fs.readFileSync(adminKeyFile, 'utf8').trim();
        } else {
            process.env.ADMIN_KEY = 'SmartParkAdmin2024';
            fs.writeFileSync(adminKeyFile, process.env.ADMIN_KEY);
        }
    } catch(e) {
        process.env.ADMIN_KEY = 'SmartParkAdmin2024';
    }
}
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
        callback(new Error('Not allowed by CORS'));
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

// Simple in-memory rate limiter
const rateLimitStore = new Map();
function rateLimit(maxRequests, windowMs) {
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };
        if (now > record.resetAt) {
            record.count = 0;
            record.resetAt = now + windowMs;
        }
        record.count++;
        rateLimitStore.set(key, record);
        if (record.count > maxRequests) {
            return res.status(429).json({ msg: 'Too many requests, please try again later' });
        }
        next();
    };
}

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// Rate limiting for API routes
app.use('/api/', rateLimit(100, 60000));

// Request body size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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