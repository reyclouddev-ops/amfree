/**
 * API Route: /api/removebg
 * Background Removal Endpoint via Pixelcut Engine
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const fsp = require('fs/promises');

async function pixa(img) {
  let filePath = img;
  let shouldCleanup = false;

  if (Buffer.isBuffer(img)) {
    filePath = path.join(os.tmpdir(), `removebg-${crypto.randomUUID()}.jpg`);
    await fsp.writeFile(filePath, img);
    shouldCleanup = true;
  }

  try {
    const fileBuffer = await fsp.readFile(filePath);
    const fileName = path.basename(filePath);

    const form = new FormData();
    form.append('image', new Blob([fileBuffer], { type: 'image/jpeg' }), fileName);
    form.append('format', 'png');
    form.append('model', 'v1');

    const res = await fetch('https://api2.pixelcut.app/image/matte/v1', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'x-locale': 'en',
        'x-client-version': 'web:pixa.com:4a5b0af2',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'origin': 'https://www.pixa.com',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://www.pixa.com/',
        'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
      },
      body: form
    });

    if (!res.ok) {
      throw new Error(`Pixelcut API Error Status: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    if (shouldCleanup) {
      try {
        await fsp.unlink(filePath);
      } catch {}
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, error: 'Method not allowed, gunakan POST dengan payload base64Image' });
  }

  try {
    const { base64Image } = req.body || {};
    if (!base64Image) {
      return res.status(400).json({ status: false, error: 'Parameter base64Image wajib disertakan!' });
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const resultBuffer = await pixa(buffer);
    const resultBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

    return res.status(200).json({
      status: true,
      creator: "ReyCloud",
      result: resultBase64
    });

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
