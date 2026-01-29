/**
 * Small proxy for Google Cloud Text-to-Speech.
 * Set GOOGLE_TTS_API_KEY in env, then: node server.js
 * Serves static files and POST /api/speak → returns MP3 audio.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_TTS_API_KEY;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ico': 'image/x-icon',
};

async function googleTTS(text) {
  if (!API_KEY) {
    throw new Error('GOOGLE_TTS_API_KEY not set');
  }
  const body = JSON.stringify({
    input: { text },
    voice: {
      languageCode: 'zh-CN',
      name: 'zh-CN-Wavenet-A',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.75,
      pitch: 0,
    },
  });
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google TTS: ${res.status} ${err}`);
  }
  const data = await res.json();
  if (!data.audioContent) {
    throw new Error('Google TTS: no audioContent');
  }
  return Buffer.from(data.audioContent, 'base64');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/speak') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    const text = (json.text || '').trim();
    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing text' }));
      return;
    }
    try {
      const audio = await googleTTS(text);
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      });
      res.end(audio);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end();
    return;
  }

  const file = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, file.replace(/\?.*$/, ''));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Pinyin Match: http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('GOOGLE_TTS_API_KEY not set — install Chinese voice for browser TTS or set the key for Google TTS.');
  } else {
    console.log('Google TTS enabled (zh-CN).');
  }
});
