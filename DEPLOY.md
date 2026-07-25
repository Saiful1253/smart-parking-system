# SmartPark Backend Setup & Deployment Guide

## Current Status
- Frontend: Deployed on GitHub Pages
- Backend: Needs to be deployed separately (Express server)

## Backend Deployment (Choose One)

### Option 1: Render.com (Recommended, Free Tier)
1. Push code to GitHub
2. Go to https://render.com and sign up
3. Create new "Web Service"  
4. Connect your GitHub repo: `saiful1253/smart-parking-system`
5. Configure:
    - **Root Directory**: `backend`
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `node server.js`
    - **Plan**: Free
6. Add environment variables (Environment tab):
    - `JWT_SECRET` = your secret key
    - `ADMIN_KEY` = your admin key (default: `SmartParkAdmin2024`)
    - `FRONTEND_URL` = `https://saiful1253.github.io`
    - `CORS_ORIGIN` = `https://saiful1253.github.io`
7. Deploy and copy the public URL (e.g., `https://smartpark-api.onrender.com`)

### Option 2: Railway.app (Free Tier)
1. Go to https://railway.app and sign up with GitHub
2. New Project -> Deploy from GitHub repo
3. Select your `smart-parking-system` repo
4. Railway auto-detects Node.js
5. Set root directory to `backend`
6. Add environment variables (`JWT_SECRET`, `ADMIN_KEY`)
7. Deploy - Railway gives you a public URL like `https://smartpark-production.up.railway.app`

### Option 3: Fly.io (Free Tier)
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Initialize in backend folder
cd backend
fly launch
# Follow prompts - choose Docker, 1 shared CPU, 256MB RAM

# Set secrets
fly secrets set JWT_SECRET=your_secret ADMIN_KEY=your_admin_key

# Deploy
fly deploy
```

## Configure Frontend for Deployed Backend

After deploying the backend, update the `<meta name="smartpark-api-url">` tag in ALL HTML files:

```html
<meta name="smartpark-api-url" content="https://your-backend-url.com">
```

Replace `https://your-backend-url.com` with your actual backend public URL (no trailing slash).

### Quick Update Script

Run this Node.js script to update all meta tags at once:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const BACKEND_URL = process.argv[2] || 'https://your-backend-url.com';
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/<meta name=\"smartpark-api-url\" content=\"[^\"]*\">/gi, 
        '<meta name=\"smartpark-api-url\" content=\"' + BACKEND_URL + '\">');
    fs.writeFileSync(file, content);
}
console.log('Updated ' + htmlFiles.length + ' HTML files');
"
```

Arguments: `node update-backend-url.js https://your-backend-url.com`

## Deployment Checklist

- [ ] Backend is deployed and has a public URL
- [ ] `data/` directory is writable on the backend server
- [ ] `JWT_SECRET` and `ADMIN_KEY` environment variables are set
- [ ] CORS allows your GitHub Pages origin (already handled in `server.js`)
- [ ] All HTML files have `<meta name="smartpark-api-url" content="https://your-backend-url.com">`
- [ ] Frontend is pushed to GitHub (GitHub Pages auto-deploys)

## Local Development

Start the backend locally:
```bash
cd backend
npm install
npm start
```

The frontend will connect to `http://localhost:3000` automatically.
