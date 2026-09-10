const https = require('https');
const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

// --- Konfigurasi Alight Motion Engine & Database ---
const KEY = 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0';
const IDT = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty';
const VFY = 'https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase';

const MONGO_URI = process.env.MONGO_URI || '';

// Koneksi ke MongoDB
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

// Skema Model API Key
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

const dip = () => `${crypto.randomInt(1, 255)}.${crypto.randomInt(0, 255)}.${crypto.randomInt(0, 255)}.${crypto.randomInt(1, 255)}`;
const sp = h => ({
  ...h,
  'x-forwarded-for': dip(),
  'x-real-ip': dip(),
  'client-ip': dip(),
  'x-client-ip': dip(),
  'x-originating-ip': dip(),
  'x-cluster-client-ip': dip()
});

const h1 = {
  'content-type': 'application/json',
  'x-android-package': 'com.alightcreative.motion',
  'x-android-cert': 'ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8',
  'user-agent': 'dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)'
};

const h2 = {
  'content-type': 'application/json; charset=utf-8',
  'user-agent': 'okhttp/3.12.1',
  'accept-encoding': 'gzip'
};

const bad = e => {
  const d = e.response?.data;
  return d ? (typeof d === 'object' ? JSON.stringify(d) : String(d)) : e.message;
};

class SimpleQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }
  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.next();
    });
  }
  next() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;
    const { fn, resolve, reject } = this.queue.shift();
    this.running++;
    fn().then(res => {
      this.running--;
      resolve(res);
      this.next();
    }).catch(err => {
      this.running--;
      reject(err);
      this.next();
    });
  }
}
const apiQueue = new SimpleQueue(1);

function extractOobCode(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/&amp;/g, '&');
  try { s = decodeURIComponent(s); } catch {}
  try {
    const u = new URL(s);
    let c = u.searchParams.get('oobCode');
    if (!c) {
      const n = u.searchParams.get('link') || u.searchParams.get('q') || u.searchParams.get('url');
      if (n) { try { c = new URL(n).searchParams.get('oobCode'); } catch {} }
    }
    if (c) return c.replace(/[^a-zA-Z0-9_-]/g, '');
  } catch {}
  const m = s.match(/oobCode=([a-zA-Z0-9_-]+)/i);
  if (m) return m[1];
  const t = raw.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(t) && !t.includes('://')) return t;
  return null;
}

const BASE_URL = 'https://akunlama.com/api';
const DOMAIN = 'akunlama.com';
const CREATOR = 'ReyCode';

const ADJECTIVES = ['happy', 'sleepy', 'clever', 'swift', 'brave', 'calm', 'wild', 'gentle', 'lucky', 'proud', 'cozy', 'fuzzy'];
const ANIMALS = ['kitten', 'cat', 'tiger', 'lion', 'panther', 'cheetah', 'lynx', 'puma', 'jaguar', 'leopard'];

function generateRandomName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    return {
        username: `${adj}-${animal}-${num}`,
        animalName: `${adj} ${animal}`
    };
}

function extractLinks(html) {
    if (typeof html !== 'string') return [];
    const links = [];
    const regex = /href=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const matchedUrl = match[1].replace(/&amp;/g, '&');
        if (!links.includes(matchedUrl)) links.push(matchedUrl);
    }
    return links;
}

function requestApi(targetUrl) {
    return new Promise((resolve, reject) => {
        https.get(targetUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve(data); }
            });
        }).on('error', reject);
    });
}

async function listInbox(username) {
    const recipient = (username || '').replace(`@${DOMAIN}`, '').trim();
    const reqUrl = `${BASE_URL}/list?recipient=${encodeURIComponent(recipient)}`;
    const res = await requestApi(reqUrl);
    return Array.isArray(res) ? res : [];
}

async function getEmailDetail(region, key) {
    const metaUrl = `${BASE_URL}/getKey?region=${encodeURIComponent(region)}&key=${encodeURIComponent(key)}`;
    const htmlUrl = `${BASE_URL}/getHtml?region=${encodeURIComponent(region)}&key=${encodeURIComponent(key)}`;
    const [meta, html] = await Promise.all([requestApi(metaUrl), requestApi(htmlUrl)]);
    const rawHtml = typeof html === 'string' ? html : JSON.stringify(html);
    return { html: rawHtml, links: extractLinks(rawHtml) };
}

async function waitForVerificationLink(username, timeoutSec = 60) {
    const clean = (username || '').replace(`@${DOMAIN}`, '').trim();
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutSec * 1000) {
        try {
            const messages = await listInbox(clean);
            if (messages.length > 0) {
                const latest = messages[0];
                const region = latest.storage?.region || 'us';
                const key = latest.storage?.key;
                if (key) {
                    const detail = await getEmailDetail(region, key);
                    const targetLink = detail.links.find(l => l.includes('firebaseapp.com') || l.includes('google.com') || l.includes('oobCode'));
                    if (targetLink) return targetLink;
                }
            }
        } catch (_) {}
        await new Promise(resolve => setTimeout(resolve, 4000));
    }
    return null;
}

async function processSingleAccount() {
    const generated = generateRandomName();
    const username = generated.username;
    const tempEmail = `${username}@${DOMAIN}`;
    const webLoginUrl = `https://${DOMAIN}`;

    const linkRes = await apiQueue.add(async () => {
        try {
            await axios.post(`${IDT}/getOobConfirmationCode?key=${KEY}`, {
                requestType: 6,
                email: tempEmail,
                androidInstallApp: true,
                canHandleCodeInApp: true,
                continueUrl: 'https://alightcreative.com?ui_sid=0366624874&ui_sd=0',
                iosBundleId: 'com.alightcreative.motion',
                androidPackageName: 'com.alightcreative.motion',
                androidMinimumVersion: '585',
                clientType: 'CLIENT_TYPE_ANDROID'
            }, { headers: sp(h1) });
            return { ok: true };
        } catch (e) { return { ok: false, why: bad(e) }; }
    });

    if (!linkRes.ok) throw new Error('Gagal mengirim oobCode: ' + linkRes.why);

    const verificationLink = await waitForVerificationLink(username, 60);
    if (!verificationLink) throw new Error('Magic link tidak tertangkap dalam 60 detik.');

    const oobCode = extractOobCode(verificationLink);
    if (!oobCode) throw new Error('Gagal mengekstrak oobCode.');

    const authRes = await apiQueue.add(async () => {
        try {
            const a = await axios.post(`${IDT}/emailLinkSignin?key=${KEY}`, {
                email: tempEmail, oobCode: oobCode, clientType: 'CLIENT_TYPE_ANDROID'
            }, { headers: sp(h1) });
            return { ok: true, idToken: a.data.idToken };
        } catch (e) { return { ok: false, why: bad(e) }; }
    });

    if (!authRes.ok) throw new Error('Gagal sign-in: ' + authRes.why);

    const orderId = 'reycode-' + crypto.randomBytes(6).toString('hex');
    const proRes = await apiQueue.add(async () => {
        try {
            const r = await axios.post(VFY, {
                data: {
                    productId: 'am.full.sub.annual.19q4',
                    token: 'mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw',
                    skuType: 'subs',
                    orderId: orderId
                }
            }, { 
                headers: sp({
                    ...h2,
                    authorization: 'Bearer ' + authRes.idToken,
                    'firebase-instance-id-token': 'cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI'
                })
            });
            return { ok: true, data: r.data };
        } catch (e) { return { ok: false, why: bad(e) }; }
    });

    if (!proRes.ok) throw new Error('Gagal aktivasi Pro: ' + proRes.why);

    return {
        success: true,
        email: tempEmail,
        weblogin: webLoginUrl,
        animal: generated.animalName,
        verification_link: verificationLink
    };
}

// --- Handler Utama Serverless (Bulk Mode + MongoDB API Key Validation) ---
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-apikey');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const body = req.method === 'GET' ? req.query : (req.body || {});
    
    // Ambil API Key dari header atau query/body request
    const apiKeyInput = req.headers['x-apikey'] || body.apikey;

    if (!apiKeyInput) {
        return res.status(403).json({
            status: false,
            creator: CREATOR,
            error: 'Akses ditolak! API Key tidak disertakan.'
        });
    }

    try {
        await connectDB();

        // Cari API Key di dalam database MongoDB
        const keyData = await ApiKey.findOne({ apikey: apiKeyInput });

        if (!keyData) {
            return res.status(403).json({
                status: false,
                creator: CREATOR,
                error: 'API Key tidak valid atau tidak terdaftar di sistem!'
            });
        }

        // Cek status atau masa aktif (expired_at)
        const now = new Date();
        if (keyData.status !== 'active' || now > new Date(keyData.expired_at)) {
            return res.status(403).json({
                status: false,
                creator: CREATOR,
                error: 'API Key sudah kadaluarsa (expired) atau dinonaktifkan. Silakan perpanjang langganan Anda via QRIS.'
            });
        }

        // Ambil parameter jumlah akun dari request (default 1, maksimal 10)
        const count = parseInt(body.count || body.jumlah || 1, 10);
        const maxCount = Math.min(Math.max(count, 1), 10);

        const results = [];
        for (let i = 0; i < maxCount; i++) {
            try {
                const acc = await processSingleAccount();
                results.push(acc);
            } catch (err) {
                results.push({ success: false, error: err.message });
            }
        }

        return res.status(200).json({
            status: true,
            creator: CREATOR,
            owner: keyData.owner,
            expired_at: keyData.expired_at,
            total_generated: maxCount,
            results: results
        });

    } catch (err) {
        return res.status(500).json({ 
            status: false, 
            creator: CREATOR,
            error: err.message 
        });
    }
};
