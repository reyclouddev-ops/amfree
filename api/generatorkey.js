const mongoose = require('mongoose');
const crypto = require('crypto');
const verifyAdmin = require('../lib/authadmin');

const MONGO_URI = process.env.MONGO_URI || '';

let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        isConnected = true;
    } catch (err) {
        throw new Error('Gagal terhubung ke MongoDB: ' + err.message);
    }
}

const apiKeySchema = new mongoose.Schema({
    apikey: { type: String, required: true, unique: true },
    owner: { type: String, default: 'Client' },
    package: { type: String, default: 'Bulk Alight Motion Pro' },
    duration_days: { type: Number, default: 30 },
    created_at: { type: Date, default: Date.now },
    expired_at: { type: Date, required: true },
    status: { type: String, default: 'active' }
});

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
const CREATOR = 'ReyCode';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = verifyAdmin(req, res);
    if (!auth.authorized) {
        return res.status(403).json(auth.response);
    }

    const body = req.method === 'GET' ? req.query : (req.body || {});

    try {
        await connectDB();

        const ownerName = body.name || body.username || 'Admin Master';
        
        // Durasi diset sangat jauh ke depan (100 tahun) agar menjadi Unlimited / Selamanya
        const durationDays = 36500; 

        const randomSixDigits = crypto.randomInt(100000, 999999);
        const newApiKey = `reycoder_${randomSixDigits}`;

        const issuedAt = new Date();
        const expiredAt = new Date();
        expiredAt.setDate(issuedAt.getDate() + durationDays);

        const newKeyDoc = new ApiKey({
            apikey: newApiKey,
            owner: ownerName,
            package: 'Unlimited Master Admin Key',
            duration_days: durationDays,
            created_at: issuedAt,
            expired_at: expiredAt,
            status: 'active'
        });

        await newKeyDoc.save();

        return res.status(200).json({
            status: true,
            creator: CREATOR,
            message: 'API Key Admin Unlimited berhasil dibuat dan disimpan ke MongoDB!',
            data: {
                apikey: newApiKey,
                owner: ownerName,
                package: 'Unlimited Master Admin Key',
                duration_days: 'Unlimited (100 Tahun)',
                created_at: issuedAt,
                expired_at: expiredAt
            }
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            creator: CREATOR,
            error: err.message
        });
    }
};
