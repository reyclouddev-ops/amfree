const mongoose = require('mongoose');

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-apikey');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const body = req.method === 'GET' ? req.query : (req.body || {});
    const inputKey = req.headers['x-apikey'] || body.apikey;

    if (!inputKey) {
        return res.status(400).json({
            status: false,
            creator: CREATOR,
            error: 'Silakan masukkan API Key Anda terlebih dahulu.'
        });
    }

    try {
        await connectDB();

        const keyData = await ApiKey.findOne({ apikey: inputKey });

        if (!keyData) {
            return res.status(404).json({
                status: false,
                creator: CREATOR,
                error: 'API Key tidak ditemukan atau tidak terdaftar!'
            });
        }

        const now = new Date();
        const expiredDate = new Date(keyData.expired_at);
        const diffTime = expiredDate - now;
        let remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let statusText = 'active';
        if (keyData.duration_days >= 30000) {
            remainingDays = 'Unlimited';
        } else if (remainingDays <= 0) {
            remainingDays = 'Expired';
            statusText = 'expired';
        }

        return res.status(200).json({
            status: true,
            creator: CREATOR,
            data: {
                apikey: keyData.apikey,
                owner: keyData.owner,
                package: keyData.package,
                created_at: keyData.created_at,
                expired_at: keyData.expired_at,
                remaining_days: remainingDays,
                status: statusText
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
