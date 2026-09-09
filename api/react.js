/**
 * API Route: /api/react
 * WhatsApp Reaction Handler with ShikyOfficial Sitekey Extractor & Solver Integration
 */

const axios = require('axios');
const crypto = require('crypto');

const TARGET_API_URL = 'https://keyyss-react.web.id/api/react';
const TARGET_BASE_URL = 'https://keyyss-react.web.id/';
const SHIKY_API_BASE = 'https://shikyofficial.my.id/api/tools';
const SHIKY_KEY = 'shiky-ofc';

async function getTurnstileToken() {
    try {
        // Step 1: Ambil sitekey dari halaman utama target
        const sitekeyRes = await axios.get(`${SHIKY_API_BASE}/sitekey`, {
            params: { url: TARGET_BASE_URL },
            headers: { 'x-api-key': SHIKY_KEY },
            timeout: 8000
        });

        const sitekey = sitekeyRes.data?.sitekey || sitekeyRes.data?.data?.sitekey;
        if (!sitekey) return null;

        // Step 2: Minta token solve ke endpoint solver menggunakan sitekey yang didapat
        const solverRes = await axios.post(`${SHIKY_API_BASE}/solver`, {
            sitekey: sitekey,
            url: TARGET_BASE_URL
        }, {
            headers: {
                'x-api-key': SHIKY_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 35000 // Proses solver biasanya butuh waktu 10-30 detik
        });

        return solverRes.data?.token || solverRes.data?.solution || solverRes.data?.result;
    } catch (err) {
        console.error("Shiky Solver Flow Error:", err.message);
        return null;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ status: false, error: 'Method not allowed' });
    }

    try {
        const waUrl = req.query.url || req.body?.url;
        const rawEmojis = req.query.emojis || req.body?.emojis || '😂';

        if (!waUrl) {
            return res.status(400).json({ status: false, error: 'Parameter url target WhatsApp wajib disertakan!' });
        }

        let emojis = rawEmojis.split(',').map(e => e.trim()).filter(Boolean).join(',');
        if (!emojis) emojis = '😂';

        const deviceFingerprint = `DEV_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

        // 1. Dapatkan token Turnstile valid via ShikyOfficial Solver
        let turnstileToken = await getTurnstileToken();
        
        // Fallback jika solver gagal atau timeout
        if (!turnstileToken) {
            turnstileToken = `0.${crypto.randomBytes(4).toString('hex')}.${crypto.randomBytes(8).toString('hex')}`;
        }

        // 2. Kirim request POST ke target Keyyss API
        const response = await axios.post(TARGET_API_URL, {
            url: waUrl,
            deviceFingerprint: deviceFingerprint,
            emojis: emojis,
            turnstileToken: turnstileToken
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'Origin': 'https://keyyss-react.web.id',
                'Referer': 'https://keyyss-react.web.id/',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Device-Fingerprint': deviceFingerprint
            },
            timeout: 15000
        });

        return res.status(200).json({
            status: true,
            creator: "ReyCloud",
            target: waUrl,
            emojis: emojis,
            fingerprint: deviceFingerprint,
            result: response.data
        });

    } catch (err) {
        let errMessage = err.message;
        if (err.response && err.response.data) {
            errMessage = typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : err.response.data;
        }
        return res.status(500).json({
            status: false,
            creator: "ReyCloud",
            message: errMessage
        });
    }
}
