const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const LPR_API_URL = 'https://api.platerecognizer.com/v1/plate-reader/';
const DEFAULT_REGIONS = process.env.LPR_DEFAULT_REGIONS || 'us,eu,bd';
const CONFIDENCE_THRESHOLD = parseFloat(process.env.LPR_CONFIDENCE_THRESHOLD || '0.7');
const INTERTRAFF_API_KEY = process.env.INTERTRAFF_API_KEY;
const INTERTRAFF_API_URL = process.env.INTERTRAFF_API_URL || 'http://84.200.6.42:5000/ObjectDetection';
const INTERTRAFF_REGION = process.env.INTERTRAFF_REGION || 'eu';

const TEMP_IMAGE_DIR = path.join(__dirname, '..', 'data', 'temp');
try { if (!fs.existsSync(TEMP_IMAGE_DIR)) fs.mkdirSync(TEMP_IMAGE_DIR, { recursive: true }); } catch (e) { console.warn('Temp dir warning:', e.message); }

function cleanupTempFiles(maxAgeMs) {
  try {
    const files = fs.readdirSync(TEMP_IMAGE_DIR);
    const now = Date.now();
    files.forEach(function(file) {
      const filePath = path.join(TEMP_IMAGE_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAgeMs) fs.unlinkSync(filePath);
      } catch (e) {}
    });
  } catch (e) {}
}

router.post('/recognize', auth, authorize(['admin']), async (req, res) => {
  try {
    const apiKey = process.env.LPR_API_KEY;
    if (!apiKey) {
      return res.json({
        success: false,
        message: 'LPR API key not configured. Add LPR_API_KEY to environment variables.',
        demo: true,
        plate: generateDemoPlate(),
        confidence: 0.92,
        region: 'BD',
        vehicle_type: 'Car',
        candidates: [{ plate: generateDemoPlate(), confidence: 0.92 }]
      });
    }

    const imageData = req.body.image;
    const regions = req.body.regions || DEFAULT_REGIONS;

    if (!imageData) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const formData = new FormData();
    formData.append('upload', new Blob([buffer], { type: 'image/jpeg' }), 'capture.jpg');
    formData.append('regions', regions);
    formData.append('mmc', '1');

    const response = await fetch(LPR_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
      body: formData
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      const errorBody = isJson ? await response.json() : await response.text();
      console.error('LPR API error:', response.status, errorBody);
      return res.status(response.status).json({
        success: false,
        message: 'LPR service error',
        details: isJson ? errorBody : String(errorBody)
      });
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const best = data.results[0];
      const plate = best.plate;
      const confidence = best.score || best.confidence || 0;
      const candidates = data.results.map(r => ({
        plate: r.plate,
        confidence: r.score || r.confidence || 0
      }));

      return res.json({
        success: true,
        plate: plate,
        confidence: confidence,
        region: best.region || regions.split(',')[0],
        vehicle_type: best.vehicle || { type: 'Car' }?.type || 'Car',
        candidates: candidates,
        processing_time: data.processing_time
      });
    }

    return res.json({
      success: true,
      message: 'No plate detected in image',
      plate: null,
      confidence: 0,
      candidates: [],
      processing_time: data.processing_time
    });
  } catch (err) {
    console.error('LPR recognition error:', err);
    res.status(500).json({ success: false, message: 'Recognition failed', error: err.message });
  }
});

router.post('/capture-from-stream', auth, authorize(['admin']), async (req, res) => {
  try {
    const streamUrl = req.body.streamUrl;
    const regions = req.body.regions || DEFAULT_REGIONS;

    if (!streamUrl) {
      return res.status(400).json({ success: false, message: 'No stream URL provided' });
    }

    if (INTERTRAFF_API_KEY) {
      return await recognizeWithIntertraffStream(streamUrl, regions, req);
    }

    const apiKey = process.env.LPR_API_KEY;
    if (!apiKey) {
      return res.json({
        success: false,
        message: 'LPR API key not configured. Add LPR_API_KEY to environment variables.',
        demo: true,
        plate: generateDemoPlate(),
        confidence: 0.92,
        region: 'BD',
        vehicle_type: 'Car',
        candidates: [{ plate: generateDemoPlate(), confidence: 0.92 }]
      });
    }

    const frameBuffer = await fetchMjpegFrame(streamUrl);
    if (!frameBuffer) {
      return res.status(400).json({ success: false, message: 'Failed to capture frame from stream. Ensure the camera serves an MJPEG stream.' });
    }

    const base64Data = frameBuffer.toString('base64');
    const imageData = 'data:image/jpeg;base64,' + base64Data;

    const formData = new FormData();
    formData.append('upload', new Blob([frameBuffer], { type: 'image/jpeg' }), 'capture.jpg');
    formData.append('regions', regions);
    formData.append('mmc', '1');

    const response = await fetch(LPR_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
      body: formData
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      const errorBody = isJson ? await response.json() : await response.text();
      console.error('LPR API error (stream):', response.status, errorBody);
      return res.status(response.status).json({
        success: false,
        message: 'LPR service error',
        details: isJson ? errorBody : String(errorBody)
      });
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const best = data.results[0];
      return res.json({
        success: true,
        plate: best.plate,
        confidence: best.score || best.confidence || 0,
        region: best.region || regions.split(',')[0],
        vehicle_type: best.vehicle || { type: 'Car' }?.type || 'Car',
        candidates: data.results.map(r => ({ plate: r.plate, confidence: r.score || r.confidence || 0 })),
        processing_time: data.processing_time,
        image: imageData
      });
    }

    return res.json({
      success: true,
      message: 'No plate detected in captured frame',
      plate: null,
      confidence: 0,
      candidates: [],
      processing_time: data.processing_time,
      image: imageData
    });
  } catch (err) {
    console.error('LPR stream capture error:', err);
    res.status(500).json({ success: false, message: 'Stream capture failed', error: err.message });
  }
});

async function recognizeWithIntertraffStream(streamUrl, regions, req) {
  cleanupTempFiles(60000);
  const frameBuffer = await fetchMjpegFrame(streamUrl);
  if (!frameBuffer) {
    return { success: false, message: 'Failed to capture frame from stream. Ensure the camera serves an MJPEG stream.' };
  }

  const filename = 'lpr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.jpg';
  const filePath = path.join(TEMP_IMAGE_DIR, filename);
  fs.writeFileSync(filePath, frameBuffer);

  const hostname = req && req.headers && req.headers.host ? req.headers.host : 'localhost:3000';
  const baseUrl = 'http://' + hostname + '/temp/';
  const imageUrl = baseUrl + filename;

  const intertraffUrl = INTERTRAFF_API_URL + '?Image_url=' + encodeURIComponent(imageUrl) + '&Api_key=' + encodeURIComponent(INTERTRAFF_API_KEY) + '&GA=' + encodeURIComponent(INTERTRAFF_REGION) + '&Detect_license_plate=true&Read_license_plate=true&Detect_make_and_model=true&Detect_vehicle_position=true&Include_additional_info=true&Input_size=416';

  try {
    const response = await fetch(intertraffUrl, { method: 'GET', headers: { 'Accept': '*/*' } });
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : {};

    let plate = null;
    let confidence = 0;
    let vehicleType = 'Car';

    if (data) {
      if (data.license_plate) { plate = data.license_plate; confidence = data.license_plate_confidence || 0; vehicleType = data.make || 'Car'; }
      else if (data.vehicles && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
        const v = data.vehicles[0];
        plate = v.license_plate || null;
        confidence = v.confidence || 0;
        vehicleType = v.make || 'Car';
      }
    }

    const candidates = plate ? [{ plate: plate, confidence: confidence }] : [];

    return {
      success: !!plate,
      plate: plate,
      confidence: confidence,
      region: INTERTRAFF_REGION,
      vehicle_type: vehicleType,
      candidates: candidates,
      raw: data,
      image: 'data:image/jpeg;base64,' + frameBuffer.toString('base64')
    };
  } catch (err) {
    console.error('Intertraff API error:', err);
    return { success: false, message: 'Intertraff recognition failed', error: err.message };
  }
}

router.post('/recognize-url', auth, authorize(['admin']), async (req, res) => {
  try {
    const imageUrl = req.body.image_url;
    const regions = req.body.regions || DEFAULT_REGIONS;
    if (!imageUrl) return res.status(400).json({ success: false, message: 'No image_url provided' });

    const apiKey = process.env.LPR_API_KEY;
    if (!apiKey) {
      return res.json({ success: false, message: 'LPR API key not configured', demo: true, plate: generateDemoPlate(), confidence: 0.92, region: 'BD', vehicle_type: 'Car', candidates: [{ plate: generateDemoPlate(), confidence: 0.92 }] });
    }

    const formData = new FormData();
    formData.append('upload_url', imageUrl);
    formData.append('regions', regions);
    formData.append('mmc', '1');

    const response = await fetch(LPR_API_URL, { method: 'POST', headers: { 'Authorization': `Token ${apiKey}` }, body: formData });
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : {};

    if (data.results && data.results.length > 0) {
      const best = data.results[0];
      return res.json({ success: true, plate: best.plate, confidence: best.score || best.confidence || 0, region: best.region || regions.split(',')[0], vehicle_type: best.vehicle || { type: 'Car' }?.type || 'Car', candidates: data.results.map(r => ({ plate: r.plate, confidence: r.score || r.confidence || 0 })), processing_time: data.processing_time });
    }
    return res.json({ success: true, message: 'No plate detected', plate: null, confidence: 0, candidates: [], processing_time: data.processing_time });
  } catch (err) {
    console.error('LPR URL recognition error:', err);
    res.status(500).json({ success: false, message: 'Recognition failed', error: err.message });
  }
});

function fetchMjpegFrame(streamUrl) {
  return new Promise((resolve, reject) => {
    const client = streamUrl.startsWith('https') ? https : http;
    const request = client.get(streamUrl, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error('Camera stream returned status ' + res.statusCode));
      }
      const contentType = res.headers['content-type'] || '';
      if (!contentType.includes('multipart/x-mixed-replace') && !contentType.includes('image/jpeg')) {
        return reject(new Error('Camera URL does not appear to be an MJPEG stream. Content-Type: ' + contentType));
      }
      const chunks = [];
      let boundary = null;
      let jpegBuffer = null;
      res.on('data', (chunk) => {
        chunks.push(chunk);
        const combined = Buffer.concat(chunks);
        if (!boundary) {
          const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/);
          if (match) boundary = (match[1] || match[2] || '').trim();
        }
        if (boundary) {
          const bdryBytes = Buffer.from('--' + boundary);
          const idx = combined.indexOf(bdryBytes);
          if (idx !== -1 && idx > 0) {
            const part = combined.slice(0, idx);
            const jpegStart = part.indexOf(Buffer.from([0xFF, 0xD8]));
            const jpegEnd = part.indexOf(Buffer.from([0xFF, 0xD9]));
            if (jpegStart !== -1 && jpegEnd !== -1 && jpegEnd > jpegStart) {
              jpegBuffer = part.slice(jpegStart, jpegEnd + 2);
              res.destroy();
              return resolve(jpegBuffer);
            }
          }
        }
      });
      res.on('end', () => {
        if (jpegBuffer) return resolve(jpegBuffer);
        const combined = Buffer.concat(chunks);
        let pos = 0;
        while (pos < combined.length - 1) {
          if (combined[pos] === 0xFF && combined[pos + 1] === 0xD8) {
            const endPos = combined.indexOf(Buffer.from([0xFF, 0xD9]), pos + 2);
            if (endPos !== -1) return resolve(combined.slice(pos, endPos + 2));
            break;
          }
          pos++;
        }
        reject(new Error('No complete JPEG frame found in stream'));
      });
      res.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(8000, () => { request.destroy(); reject(new Error('Camera stream connection timed out')); });
  });
}

function generateDemoPlate() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  let plate = '';
  for (let i = 0; i < 2; i++) plate += chars[Math.floor(Math.random() * chars.length)];
  plate += '-';
  for (let i = 0; i < 4; i++) plate += nums[Math.floor(Math.random() * nums.length)];
  plate += '-';
  for (let i = 0; i < 2; i++) plate += chars[Math.floor(Math.random() * chars.length)];
  return plate;
}

module.exports = router;
