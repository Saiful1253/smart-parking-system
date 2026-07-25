#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.argv[2];
if (!BACKEND_URL) {
    console.error('Usage: node update-backend-url.js <backend-url>');
    console.error('Example: node update-backend-url.js https://smartpark-api.onrender.com');
    process.exit(1);
}

const cleaned = BACKEND_URL.replace(/\/$/, '');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

let updated = 0;
for (const file of htmlFiles) {
    const filePath = path.join('.', file);
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /<meta name="smartpark-api-url" content="[^"]*">/gi;
    const matches = content.match(regex);
    
    if (!matches) {
        // Insert after viewport meta
        content = content.replace(
            /(<meta name="viewport" content="width=device-width, initial-scale=1\.0">)\s*(\n)/i,
            `$1\n    <meta name="smartpark-api-url" content="${cleaned}">$2`
        );
    } else {
        content = content.replace(regex, `<meta name="smartpark-api-url" content="${cleaned}">`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${file}`);
    updated++;
}

console.log(`\nDone! Updated ${updated} HTML files with API URL: ${cleaned}`);
