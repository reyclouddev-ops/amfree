const axios = require('axios');
const crypto = require('crypto');
const { link, auth, pro, re, code } = require('../lib/auth');

/* ============================================================
 * MAIL.TM CLIENT ENGINE UNTUK AUTO 1 CLICK
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
            const linkText = this.extractVerificationLink(content);
            if (linkText) return linkText;
          }
        }
      } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return null;
  }
}

const mailClient = new MailTmBackend();

/* ============================================================
 * HANDLER UTAMA API (AUTO 1 CLICK)
 * ============================================================ */
module.exports = async function handler(req, res) {
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

    const { domain } = req.body || {};

    try {
        // 1. Buat akun mail.tm instan
        const account = await mailClient.createAccount(domain);
        const tempEmail = account.address;
        const tempPassword = account.password;
        const tempToken = account.token;
        const webLoginUrl = 'https://mail.tm';

        // 2. Kirim magic link menggunakan fungsi `link` dari `lib/auth`
        const linkRes = await link(tempEmail);
        if (!linkRes.ok) {
            return res.status(400).json({ status: false, error: 'Gagal mengirim magic link: ' + linkRes.why });
        }

        // 3. Tunggu & tangkap link verifikasi otomatis via mail.tm
        const verificationLink = await mailClient.waitForVerificationLink(tempToken, 60);
        if (!verificationLink) {
            return res.status(400).json({ 
                status: false, 
                error: 'Magic link tidak tertangkap secara otomatis dalam waktu 60 detik.',
                data: { email: tempEmail, password: tempPassword, webLoginUrl }
            });
        }

        // 4. Tukar kode dengan token Firebase menggunakan fungsi `auth` dari `lib/auth`
        const authRes = await auth(tempEmail, verificationLink);
        if (!authRes.ok) {
            return res.status(400).json({ status: false, error: 'Verifikasi Gagal: ' + authRes.why });
        }

        // 5. Tembak validator pembelian menggunakan fungsi `pro` dari `lib/auth`
        const proRes = await pro(authRes.id);
        if (!proRes.ok) {
            return res.status(400).json({ status: false, error: 'Gagal menerapkan lisensi Pro: ' + proRes.why });
        }

        // 6. Hitung masa aktif 1 tahun ke depan
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const dynamicValidUntil = expiryDate.toLocaleDateString('id-ID', options).toUpperCase();

        const accountData = {
            email: tempEmail,
            password: tempPassword,
            webLoginUrl: webLoginUrl,
            uid: authRes.uid,
            displayName: authRes.user?.displayName || tempEmail.split('@')[0],
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
            message: 'Auto 1 Click & Lisensi Pro Berhasil Diaktifkan!',
            data: accountData
        });

    } catch (err) {
        return res.status(500).json({ status: false, error: 'Kesalahan server internal: ' + err.message });
    }
};
