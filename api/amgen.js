/*
Name: Alight Motion Generator Full Backend Engine
*/

const { link, auth, pro, re, code } = require('../lib/auth');

export default async function handler(req, res) {
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

    const { action, email, magicLink, refreshToken } = req.body || {};

    try {
        // Aksi 1: Kirim Magic Link ke Email
        if (action === 'send-link') {
            if (!email) return res.status(400).json({ status: false, error: 'Email wajib diisi!' });
            
            const result = await link(email);
            if (result.ok) {
                return res.status(200).json({ status: true, message: 'Magic link berhasil dikirim ke email.' });
            } else {
                return res.status(400).json({ status: false, error: result.why || 'Gagal mengirim tautan.' });
            }
        }

        // Aksi 2: Verifikasi Magic Link & Aktifkan Paket Pro Otomatis
        else if (action === 'verify-link') {
            if (!email || !magicLink) {
                return res.status(400).json({ status: false, error: 'Email dan Magic Link wajib diisi!' });
            }

            // Step A: Tukar oobCode dengan token auth Firebase
            const authRes = await auth(email, magicLink);
            if (!authRes.ok) {
                return res.status(400).json({ status: false, error: 'Verifikasi Gagal: ' + authRes.why });
            }

            // Step B: Tembak validator pembelian (verifyPurchase) untuk mengaktifkan status Pro 1 Tahun
            const proRes = await pro(authRes.id);
            if (!proRes.ok) {
                return res.status(400).json({ status: false, error: 'Gagal menerapkan lisensi Pro: ' + proRes.why });
            }

            // Hitung masa aktif otomatis 1 tahun ke depan secara dinamis
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const dynamicValidUntil = expiryDate.toLocaleDateString('id-ID', options).toUpperCase();

            // Susun data detail akun untuk dikembalikan ke frontend
            const accountData = {
                email: authRes.email,
                uid: authRes.uid,
                displayName: authRes.user?.displayName || email.split('@')[0],
                membershipStatus: "PREMIUM_ACTIVE",
                planName: "Alight Motion Pro",
                orderId: proRes.order,
                validUntil: dynamicValidUntil,
                idToken: authRes.id,
                refreshToken: authRes.ref,
                premium: true,
                rawResponse: proRes.r
            };

            return res.status(200).json({
                status: true,
                message: 'Lisensi Pro Berhasil Diaktifkan!',
                data: accountData
            });
        }

        // Aksi 3: Refresh Token Sesi
        else if (action === 'refresh-token') {
            if (!refreshToken) return res.status(400).json({ status: false, error: 'Refresh token diperlukan.' });
            
            const refRes = await re(refreshToken);
            if (refRes.ok) {
                return res.status(200).json({ status: true, idToken: refRes.id, refreshToken: refRes.ref });
            } else {
                return res.status(400).json({ status: false, error: refRes.why });
            }
        }

        else {
            return res.status(400).json({ status: false, error: 'Aksi tidak dikenal.' });
        }

    } catch (err) {
        return res.status(500).json({ status: false, error: 'Kesalahan server internal: ' + err.message });
    }
}
