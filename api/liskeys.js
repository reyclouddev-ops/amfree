const mongoose = require('mongoose');
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

    try {
        await connectDB();

        // Ambil semua data API Key dari database, urutkan dari yang terbaru
        const keys = await ApiKey.find({}).sort({ created_at: -1 });
        const now = new Date();

        // Petakan data untuk menghitung sisa hari secara dinamis
        const formattedKeys = keys.map(k => {
            const expiredDate = new Date(k.expired_at);
            const diffTime = expiredDate - now;
            let remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Jika durasi awalnya diset sangat besar (unlimited/100 tahun)
            let statusText = 'active';
            if (k.duration_days >= 30000) {
                remainingDays = 'Unlimited';
            } else if (remainingDays <= 0) {
                remainingDays = 'Expired';
                statusText = 'expired';
            }

            return {
                id: k._id,
                apikey: k.apikey,
                owner: k.owner,
                package: k.package,
                created_at: k.created_at,
                expired_at: k.expired_at,
                remaining_days: remainingDays,
                status: statusText
            };
        });

        return res.status(200).json({
            status: true,
            creator: CREATOR,
            total: formattedKeys.length,
            keys: formattedKeys
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            creator: CREATOR,
            error: err.message
        });
    }
};
