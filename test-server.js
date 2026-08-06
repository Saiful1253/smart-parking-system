const http = require('http');
const fs = require('fs');
const path = require('path');

const DOCS_DIR = 'D:/Projects all web designning/Smart Parking Syastem/docs';

const server = http.createServer((req, res) => {
    let filePath = path.join(DOCS_DIR, req.url === '/' ? 'admin.html' : req.url);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200);
        res.end(data);
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
