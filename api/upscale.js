/**
 * API Route: /api/upscale
 * Image Upscaler via Cloudinary API
 */

const axios = require('axios');
const FormData = require('form-data');

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtz0urit6/auto/upload';
const SIGN_URL = 'https://cloudinary-tools.netlify.app/.netlify/functions/sign-upload-params';
const API_KEY = '985946268373735';
const UPLOAD_PRESET = 'cloudinary-tools';

async function getSignature() {
    const timestamp = Math.floor(Date.now() / 1000);
    const { data } = await axios.post(SIGN_URL, {
        paramsToSign: { timestamp, upload_preset: UPLOAD_PRESET, source: 'ml' }
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://cloudinary-tools.netlify.app',
            'Referer': 'https://cloudinary-tools.netlify.app/',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
        }
    });
    return { signature: data.signature, timestamp };
}

async function upscaleImage(fileInput, filename = 'image.jpg') {
    try {
        let fileStreamOrBuffer = fileInput;

        if (typeof fileInput === 'string' && (fileInput.startsWith('http://') || fileInput.startsWith('https://'))) {
            const response = await axios.get(fileInput, { responseType: 'arraybuffer' });
            fileStreamOrBuffer = Buffer.from(response.data);
        }

        let safeFilename = filename;
        if (safeFilename.endsWith('.jpg')) {
            safeFilename = safeFilename.replace('.jpg', '.jpeg');
        } else if (!safeFilename.includes('.')) {
            safeFilename = 'image.jpeg';
        }

        const sig = await getSignature();
        
        const form = new FormData();
        form.append('file', fileStreamOrBuffer, { filename: safeFilename });
        form.append('upload_preset', UPLOAD_PRESET);
        form.append('source', 'ml');
        form.append('api_key', API_KEY);
        form.append('signature', sig.signature);
        form.append('timestamp', sig.timestamp);

        const { data } = await axios.post(CLOUDINARY_URL, form, {
            headers: {
                ...form.getHeaders(),
                'Origin': 'https://upload-widget.cloudinary.com',
                'Referer': 'https://upload-widget.cloudinary.com/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
            }
        });

        const publicId = data.public_id;
        const upscaledUrl = `https://res.cloudinary.com/dtz0urit6/image/upload/f_jpg,e_upscale,q_auto/${publicId}.jpg`;

        return {
            status: true,
            creator: "ReyCloudSHP",
            public_id: publicId,
            original_url: data.secure_url,
            url: upscaledUrl
        };
    } catch (err) {
        throw new Error(err.response ? JSON.stringify(err.response.data) : err.message);
    }
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: false, error: 'Method not allowed' });
    }

    try {
        const { imageUrl, base64Image, filename } = req.body || {};
        let inputData = imageUrl || base64Image;

        if (!inputData) {
            return res.status(400).json({ status: false, error: 'URL gambar atau data base64 wajib disertakan!' });
        }

        // Jika input berupa base64, ubah ke Buffer
        if (inputData.startsWith('data:image')) {
            const base64Data = inputData.split(';base64,').pop();
            inputData = Buffer.from(base64Data, 'base64');
        }

        const result = await upscaleImage(inputData, filename || 'upload.jpg');
        return res.status(200).json(result);

    } catch (err) {
        return res.status(500).json({ status: false, error: err.message });
    }
};
