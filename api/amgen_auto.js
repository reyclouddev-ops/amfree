import axios from 'axios';
import crypto from 'crypto';

/* ============================================================
 * 1. MAIL.TM BACKEND ENGINE (SUPPORT SELECTED DOMAIN)
 * ============================================================ */
const MAIL_TM_BASE = 'https://api.mail.tm';

class MailTmBackend {
  constructor() {
    this.cachedDomains = [];
  }

  async getDomains() {
    if (this.cachedDomains.length > 0) return this.cachedDomains;
    try {
      const res = await axios.get(`${MAIL_TM_BASE}/domains`);
      if (res.data && Array.isArray(res.data['hydra:member'])) {
        this.cachedDomains = res.data['hydra:member'].map(d => d.domain);
        return this.cachedDomains;
      }
    } catch {}
    return ['mail.tm', 'mail.insa.kr', 'gandalf.net'];
  }

  async createAccount(selectedDomain = null) {
    const domains = await this.getDomains();
    let domain = selectedDomain ? selectedDomain.trim().toLowerCase().replace(/^@/, '') : null;
    
    if (!domain || !domains.includes(domain)) {
      domain = domains[Math.floor(Math.random() * domains.length)];
    }

    const username = `rcs_${Math.random().toString(36).substring(2, 10)}`;
    const address = `${username}@${domain}`;
    
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const password = `psw-${randomSuffix}`;

    try {
      await axios.post(`${MAIL_TM_BASE}/accounts`, { address, password }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const tokenRes = await axios.post(`${MAIL_TM_BASE}/token`, { address, password }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const token = tokenRes.data?.token;
      if (!token) throw new Error('Gagal mendapatkan token autentikasi Mail.tm.');

      return { address, password, token };
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  }

  async fetchMessages(token) {
    try {
      const res = await axios.get(`${MAIL_TM_BASE}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.data['hydra:member'] || [];
    } catch {
      return [];
    }
  }

  async getMessageDetails(token, messageId) {
    try {
      const res = await axios.get(`${MAIL_TM_BASE}/messages/${messageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.data;
    } catch {
      return null;
    }
  }

  extractVerificationLink(htmlOrText) {
    if (!htmlOrText) return null;
    const match = htmlOrText.match(/https?:\/\/[^\s"'<>]+?(?:oobCode|verify|auth)[^\s"'<>]+/i);
    if (match) return match[0];

    const generalMatch = htmlOrText.match(/https?:\/\/[^\s"'<>]+alightcreative[^\s"'<>]*/i);
    return generalMatch ? generalMatch[0] : null;
  }

  async waitForVerificationLink(token, timeoutSec = 60) {
    const startTime = Date.now();
    const interval = 5000;

    while (Date.now() - startTime < timeoutSec * 1000) {
      try {
        const messages = await this.fetchMessages(token);
        if (messages.length > 0) {
          const latestMsg = messages[0];
          const details = await this.getMessageDetails(token, latestMsg.id);
          
          if (details) {
            const content = details.html?.[0] || details.text || '';
            const link = this.extractVerificationLink(content);
            if (link) return link;
          }
        }
      } catch (_) {}
      await new Promise(res => setTimeout(res, interval));
    }
    return null;
  }
}

const mailClient = new MailTmBackend();

/* ============================================================
 * 2. ALIGHT MOTION FIREBASE LOGIC
 * ============================================================ */
const key = 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0';
const idt = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty';
const vfy = 'https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase';

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
  let s = String(raw).replace(/&amp;/g, '&').trim();
  try { s = decodeURIComponent(s); } catch {}

  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    let c = u.searchParams.get('oobCode');
    if (!c) {
      for (const [_, val] of u.searchParams.entries()) {
        if (val.includes('oobCode=')) {
          try {
            const innerU = new URL(val.startsWith('http') ? val : `https://${val}`);
            c = innerU.searchParams.get('oobCode');
            if (c) break;
          } catch {}
        }
      }
    }
    if (c) return c.replace(/[^a-zA-Z0-9_-]/g, '');
  } catch {}

  const m = s.match(/oobCode=([a-zA-Z0-9_.-]+)/i);
  if (m) return m[1].replace(/&.*$/, '').replace(/[^a-zA-Z0-9_-]/g, '');

  const t = s.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(t) && !t.includes('://')) return t;
  return null;
}

async function sendMagicLink(email) {
  return apiQueue.add(async () => {
    try {
      await axios.post(`${idt}/getOobConfirmationCode?key=${key}`, {
        requestType: 6,
        email: email,
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
}

async function verifyAndActivate(email, rawLink) {
  return apiQueue.add(async () => {
    const c = extractOobCode(rawLink);
    if (!c) return { ok: false, why: 'OobCode / Magic Link tidak valid atau gagal dibaca!' };
    try {
      const a = await axios.post(`${idt}/emailLinkSignin?key=${key}`, {
        email: email, oobCode: c, clientType: 'CLIENT_TYPE_ANDROID'
      }, { headers: sp(h1) });
      
      const idToken = a.data?.idToken;
      if (!idToken) throw new Error('Gagal mendapatkan idToken dari Firebase.');

      const orderId = 'reycloudshp-' + crypto.randomBytes(6).toString('hex');
      const b = {
        data: {
          productId: 'am.full.sub.annual.19q4',
          token: 'mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw',
          skuType: 'subs',
          orderId: orderId
        }
      };
      const headersReq = {
        ...h2,
        authorization: 'Bearer ' + idToken,
        'firebase-instance-id-token': 'cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI'
      };

      const r = await axios.post(vfy, b, { headers: sp(headersReq) });
      return { 
        ok: true, 
        data: {
          email,
          orderId,
          validUntil: '1 Tahun Dari Sekarang',
          membershipStatus: 'PREMIUM_ACTIVE',
          rawResponse: r.data
        } 
      };
    } catch (e) { return { ok: false, why: bad(e) }; }
  });
}

/* ============================================================
 * 3. HANDLER UTAMA API
 * ============================================================ */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    const { domain } = req.body || {};

    // Buat akun mail.tm dengan pilihan domain (jika ada)
    const account = await mailClient.createAccount(domain);
    const email = account.address;
    const password = account.password;
    const token = account.token;
    const webLoginUrl = 'https://mail.tm';

    const sendRes = await sendMagicLink(email);
    if (!sendRes.ok) throw new Error(sendRes.why || 'Gagal mengirim magic link.');

    const verificationLink = await mailClient.waitForVerificationLink(token, 60);
    if (!verificationLink) {
      return res.status(400).json({
        status: false,
        message: 'Magic link tidak tertangkap secara otomatis dalam waktu 60 detik.',
        data: { email, password, token, webLoginUrl }
      });
    }

    const activateRes = await verifyAndActivate(email, verificationLink);
    if (!activateRes.ok) throw new Error(activateRes.why || 'Gagal aktivasi premium.');

    return res.status(200).json({
      status: true,
      data: {
        email,
        password,
        token,
        webLoginUrl,
        orderId: activateRes.data.orderId,
        validUntil: activateRes.data.validUntil,
        membershipStatus: activateRes.data.membershipStatus
      }
    });

  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
}
