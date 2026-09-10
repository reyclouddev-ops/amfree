const https = require('https');
const axios = require('axios');
const crypto = require('crypto');

// --- Konfigurasi Alight Motion Engine ---
const KEY = 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0';
const IDT = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty';
const VFY = 'https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase';

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

// Simple Async Queue Class (Concurrency = 1)
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

// --- Konfigurasi AkunLama Scraper Engine ---
const BASE_URL = 'https://akunlama.com/api';
const DOMAIN = 'akunlama.com';
const CREATOR = 'Lann';

const ADJECTIVES = ['happy', 'sleepy', 'clever', 'swift', 'brave', 'calm', 'wild', 'gentle', 'lucky', 'proud', 'cozy', 'fuzzy'];
const ANIMALS = ['kitten', 'cat', 'tiger', 'lion', 'panther', 'cheetah', 'lynx', 'puma', 'jaguar', 'leopard'];

function generateRandomName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 90) + 10; // 2 digit random number
    return {
        username: `${adj}-${animal}-${num}`,
        animalName: `${adj} ${animal}`
    };
}

function stripHtml(html) {
    if (typeof html !== 'string') return '';
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
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

// --- Handler Utama Serverless ---
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const body = req.method === 'GET' ? req.query : (req.body || {});
    const action = body.action;

    try {
        if (req.method === 'GET' && !action && !body.username && !body.user) {
            return res.status(200).json({ 
                status: true, 
                creator: CREATOR,
                domain: DOMAIN,
                message: 'AM Engine + AkunLama Scraper Active' 
            });
        }

        const requestedUser = body.username || body.user;
        let username, animalName = null;
        
        if (requestedUser) {
            username = requestedUser.replace(`@${DOMAIN}`, '').trim();
            animalName = "Custom User Input";
        } else {
            const generated = generateRandomName();
            username = generated.username;
            animalName = generated.animalName;
        }

        const tempEmail = `${username}@${DOMAIN}`;
        const webLoginUrl = `https://${DOMAIN}`;

        // 1. Kirim link verifikasi Google Auth via AM Engine (`link` function)
        const linkRes = await apiQueue.add(async () => {
            try {
                const r = await axios.post(`${IDT}/getOobConfirmationCode?key=${KEY}`, {
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

        if (!linkRes.ok) {
            throw new Error('Gagal mengirim oobCode via Google Auth: ' + linkRes.why);
        }

        // 2. Tunggu email masuk menggunakan scraper AkunLama
        const verificationLink = await waitForVerificationLink(username, 60);
        if (!verificationLink) {
            return res.status(400).json({ 
                status: false, 
                error: 'Magic link / oobCode tidak tertangkap dalam 60 detik.',
                card: { email: tempEmail, weblogin: webLoginUrl, selamat_kamu_mendapatkan_animal: animalName }
            });
        }

        // 3. Sign-in dengan email link untuk mendapatkan token akun (`auth` function)
        const oobCode = extractOobCode(verificationLink);
        if (!oobCode) {
            throw new Error('Gagal mengekstrak oobCode dari link yang diterima.');
        }

        const authRes = await apiQueue.add(async () => {
            try {
                const a = await axios.post(`${IDT}/emailLinkSignin?key=${KEY}`, {
                    email: tempEmail, oobCode: oobCode, clientType: 'CLIENT_TYPE_ANDROID'
                }, { headers: sp(h1) });
                return { ok: true, idToken: a.data.idToken };
            } catch (e) { return { ok: false, why: bad(e) }; }
        });

        if (!authRes.ok) {
            throw new Error('Gagal sign-in dengan email link: ' + authRes.why);
        }

        // 4. Hit endpoint verifikasi pembelian/pro (`pro` function)
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

        if (!proRes.ok) {
            throw new Error('Gagal memproses aktivasi Pro: ' + proRes.why);
        }

        // Output Response Card Sukses
        return res.status(200).json({
            status: true,
            creator: CREATOR,
            message: 'Auto 1 Click Alight Motion Pro Berhasil!',
            card: {
                email: tempEmail,
                weblogin: webLoginUrl,
                selamat_kamu_mendapatkan_animal: animalName,
                verification_link: verificationLink,
                panduan_dan_cara_login: [
                    "1. Gunakan akun email sementara di atas untuk login ke aplikasi Alight Motion.",
                    "2. Cek kotak masuk melalui situs web login yang tertera jika membutuhkan verifikasi tambahan.",
                    "3. Status akun Anda telah berhasil ditingkatkan ke versi Pro secara otomatis."
                ],
                pro_response: proRes.data
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
