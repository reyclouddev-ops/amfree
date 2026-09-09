/**
 * API Route: /api/react
 * Advanced Server-Side Proxy & Hard Bypass Handler for WhatsApp Reaction
 */

const axios = require('axios');
const crypto = require('crypto');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const TARGET_API_URL = 'https://keyyss-react.web.id/api/react';
const TARGET_BASE_URL = 'https://keyyss-react.web.id/';

// Inisialisasi cookie jar untuk mempertahankan sesi
const cookieJar = new CookieJar();
const httpClient = wrapper(
    axios.create({
        jar: cookieJar,
        withCredentials: true,
    })
);

async function sendKeyyssReaction(waUrl, rawEmojis) {
    if (!waUrl) {
        return { status: false, message: "URL Target WhatsApp wajib diisi!" };
    }

    let emojis = '😂,,,';
    if (rawEmojis) {
        emojis = rawEmojis.split(',').map(r => r.trim()).filter(Boolean).join(',');
        const parts = rawEmojis.split(',');
        while (emojis.split(',').length < parts.length) emojis += ',';
    }

    const deviceFingerprint = `DEV_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const dummyTurnstile = `${crypto.randomBytes(2).toString('hex').toUpperCase()}.${crypto.randomBytes(4).toString('hex').toUpperCase()}.${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    try {
        // Step 1: Pre-flight request ke halaman utama untuk mengambil sesi/cookie verifikasi (jika diperlukan oleh WAF target)
        try {
            await httpClient.get(TARGET_BASE_URL, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': TARGET_BASE_URL
                },
                timeout: 8000
            });
        } catch (e) {
            // Lanjutkan jika pre-flight opsional gagal
        }

        // Step 2: Kirim payload utama dengan header spoofing tingkat lanjut
        const response = await httpClient.post(TARGET_API_URL, {
            url: waUrl,
            deviceFingerprint: deviceFingerprint,
            emojis: emojis,
            turnstileToken: dummyTurnstile
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Device-Fingerprint': deviceFingerprint,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                'Referer': TARGET_BASE_URL,
                'Origin': 'https://keyyss-react.web.id',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 15000
        });

        return {
            status: true,
            creator: "ReyCloud",
            target: waUrl,
            emojis: emojis,
            fingerprint: deviceFingerprint,
            result: response.data
        };

    } catch (err) {
        const errMessage = err.response ? JSON.stringify(err.response.data) : err.message;
        return {
            status: false,
            creator: "ReyCloud",
            message: errMessage
        };
    }
}

// Vercel Serverless Handler
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const waUrl = req.query.url || req.body?.url;
    const emojis = req.query.emojis || req.body?.emojis;

    if (!waUrl) {
        return res.status(400).json({ status: false, error: 'Parameter url target WhatsApp wajib disertakan!' });
    }

    const result = await sendKeyyssReaction(waUrl, emojis);
    return res.status(result.status ? 200 : 500).json(result);
}
