# SmartPark Deployment Guide

## GitHub Pages (Static Hosting)

This version runs entirely in the browser using localStorage. No backend server is required.

### Deploy Steps

1. Push code to GitHub
2. Enable GitHub Pages in repository settings (source: main branch, root)
3. All data is stored per-user in browser localStorage

### Local Development

Serve the static files locally:

```bash
npx serve .
```

Or simply open `index.html` in a browser.
