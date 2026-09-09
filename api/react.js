/**
 * API Route: /api/react
 * Cloudflare Bypass & Advanced Header Spoofing for WhatsApp Reaction Handler
 */

const axios = require('axios');
const crypto = require('crypto');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const TARGET_API_URL = 'https://keyyss-react.web.id/api/react';
const TARGET_BASE_URL = 'https://keyyss-react.web.id/';

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
    const dummyTurnstile = `0.${crypto.randomBytes(4).toString('hex').toLowerCase()}.${crypto.randomBytes(8).toString('hex').toLowerCase()}`;

    // Gunakan CookieJar baru untuk setiap sesi agar bersih dari cache terblokir
    const cookieJar = new CookieJar();
    const httpClient = wrapper(
        axios.create({
            jar: cookieJar,
            withCredentials: true,
            maxRedirects: 5
        })
    );

    const commonHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    };

    try {
        // Step 1: Hit halaman utama terlebih dahulu untuk mendapatkan cookie clearance Cloudflare (__cf_bm dll)
        await httpClient.get(TARGET_BASE_URL, {
            headers: commonHeaders,
            timeout: 10000
        });

        // Step 2: Kirim request POST API dengan header yang menyamar sebagai Fetch dari halaman utama
        const response = await httpClient.post(TARGET_API_URL, {
            url: waUrl,
            deviceFingerprint: deviceFingerprint,
            emojis: emojis,
            turnstileToken: dummyTurnstile
        }, {
            headers: {
                ...commonHeaders,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Device-Fingerprint': deviceFingerprint,
                'Referer': TARGET_BASE_URL,
                'Origin': 'https://keyyss-react.web.id'
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
        let errMessage = err.message;
        if (err.response) {
            const data = err.response.data;
            if (typeof data === 'string' && data.includes('Just a moment')) {
                errMessage = "Cloudflare Challenge terdeteksi (IP server Vercel memerlukan izin clearance).";
            } else {
                errMessage = typeof data === 'object' ? JSON.stringify(data) : data;
            }
        }
        return {
            status: false,
            creator: "ReyCloud",
            message: errMessage
        };
    }
}

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
