/*
Name: Alight Motion Premium Scraper Module
Base Url: https://satriam.satriadeveloperz.workers.dev
*/

const axios = require('axios');

class AlightMotionScraper {
    constructor() {
        this.baseUrl = 'https://satriam.satriadeveloperz.workers.dev';
        this.headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/151.0.0.0 Mobile Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        };
    }

    async requestMagicLink(email) {
        try {
            const response = await axios.post(`${this.baseUrl}/api/satriam/send-link`, { email }, {
                headers: this.headers,
                timeout: 30000
            });
            return {
                status: true,
                message: response.data.message || 'Magic link berhasil dikirim ke email.',
                raw: response.data
            };
        } catch (error) {
            return {
                status: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async verifyMagicLink(email, magicLink) {
        try {
            const response = await axios.post(`${this.baseUrl}/api/satriam/verify-link`, {
                email,
                magicLink
            }, {
                headers: this.headers,
                timeout: 30000
            });

            const data = response.data;
            return {
                status: true,
                data: {
                    email: data.email || email,
                    uid: data.uid || '',
                    displayName: data.displayName || 'Unknown',
                    membershipStatus: data.membershipStatus || 'PREMIUM_ACTIVE',
                    planName: data.planName || 'Alight Motion Premium',
                    orderId: data.orderId || '',
                    validUntil: data.validUntil || '',
                    features: data.features || [],
                    idToken: data.idToken || '',
                    refreshToken: data.refreshToken || '',
                    premium: true
                }
            };
        } catch (error) {
            return {
                status: false,
                error: error.response?.data?.message || error.message
            };
        }
    }
}

const scraper = new AlightMotionScraper();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: false, message: 'Method not allowed, use POST' });
    }

    const { action, email, magicLink } = req.body || {};

    try {
        if (action === 'send-link') {
            if (!email) return res.status(400).json({ status: false, message: 'Email wajib diisi!' });
            const result = await scraper.requestMagicLink(email);
            return res.status(200).json(result);
        } 
        
        else if (action === 'verify-link') {
            if (!email || !magicLink) return res.status(400).json({ status: false, message: 'Email dan Magic Link wajib diisi!' });
            const result = await scraper.verifyMagicLink(email, magicLink);
            return res.status(200).json(result);
        } 
        
        else {
            return res.status(400).json({ status: false, message: 'Action tidak valid! Gunakan "send-link" atau "verify-link".' });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
}
