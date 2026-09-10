const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import fungsi-fungsi helper atau modul yang sudah ada
const { link, auth, pro, re, code } = require('../lib/auth');
const verifyAdmin = require('../lib/authadmin');

// 1. Endpoint Alight Motion Generator (Contoh)
app.all('/api/amgen', async (req, res) => {
    const query = req.method === 'GET' ? req.query : req.body;
    const { action, email, oobCode, ref, idToken } = query;

    try {
        if (action === 'link') {
            if (!email) return res.json({ ok: false, why: 'Email diperlukan' });
            const result = await link(email);
            return res.json(result);
        } else if (action === 'auth') {
            if (!email || !oobCode) return res.json({ ok: false, why: 'Email dan oobCode diperlukan' });
            const result = await auth(email, oobCode);
            return res.json(result);
        } else if (action === 'pro') {
            if (!idToken) return res.json({ ok: false, why: 'idToken diperlukan' });
            const result = await pro(idToken);
            return res.json(result);
        } else if (action === 'refresh') {
            if (!ref) return res.json({ ok: false, why: 'Refresh token diperlukan' });
            const result = await re(ref);
            return res.json(result);
        } else {
            return res.json({ ok: false, why: 'Aksi tidak valid. Gunakan action=link, auth, pro, atau refresh' });
        }
    } catch (e) {
        return res.status(500).json({ ok: false, why: e.message });
    }
});

// 2. Endpoint Contoh Lain (Chat, AI, Downloader, dll)
app.all('/api/chat', async (req, res) => {
    res.json({ status: true, creator: 'ReyCode', message: 'Endpoint Chat AI aktif!' });
});

app.all('/api/igdl', async (req, res) => {
    res.json({ status: true, creator: 'ReyCode', message: 'Endpoint Instagram Downloader aktif!' });
});

// Handler utama root
app.get('/', (req, res) => {
    res.json({
        status: true,
        creator: 'ReyCode',
        message: 'ReyCloud AM Generator & Tools API is running smoothly on Vercel!'
    });
});

// Export handler untuk Vercel Serverless
module.exports = app;
