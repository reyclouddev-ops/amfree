const axios = require('axios');
const crypto = require('crypto');

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
        this.cachedDomains = res.data['hydra:member'];
        return this.cachedDomains;
      }
    } catch {}
    return [{ domain: 'mail.tm', isActive: true }];
  }

  async createAccount(selectedDomain = null) {
    const domainList = await this.getDomains();
    const activeDomains = domainList.filter(d => d.isActive).map(d => d.domain);
    
    let domain = selectedDomain ? selectedDomain.trim().toLowerCase().replace(/^@/, '') : null;
    if (!domain || !activeDomains.includes(domain)) {
      domain = activeDomains[Math.floor(Math.random() * activeDomains.length)] || 'mail.tm';
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
      if (!token) throw new Error('Gagal mendapatkan token Mail.tm.');

      return { address, password, token };
    } catch (err) {
      throw new Error('Mail.tm Error: ' + (err.response?.data?.message || err.message));
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
    while (Date.now() - startTime < timeoutSec * 1000) {
      try {
        const messages = await this.fetchMessages(token);
        if (messages.length > 0) {
          const details = await this.getMessageDetails(token, messages[0].id);
          if (details) {
            const content = details.html?.[0] || details.text || '';
            const linkText = this.extractVerificationLink(content);
            if (linkText) return linkText;
          }
        }
      } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 4000));
    }
    return null;
  }
}

const mailClient = new MailTmBackend();

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, domain } = req.method === 'GET' ? req.query : (req.body || {});

    try {
        if (req.method === 'GET' || action === 'get-domains') {
            const domains = await mailClient.getDomains();
            return res.status(200).json({ status: true, domains });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ status: false, error: 'Method not allowed' });
        }

        // 1. Buat akun mail.tm
        const account = await mailClient.createAccount(domain);
        const tempEmail = account.address;
        const tempPassword = account.password;
        const tempToken = account.token;
        const webLoginUrl = 'https://mail.tm';

        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;

        // 2. Numpang kirim magic link ke /api/amgen
        const sendRes = await axios.post(`${baseUrl}/api/amgen`, {
            action: 'send-link',
            email: tempEmail
        });

        if (!sendRes.data || !sendRes.data.status) {
            throw new Error('Gagal mengirim magic link via amgen.');
        }

        // 3. Tunggu link masuk di mail.tm
        const verificationLink = await mailClient.waitForVerificationLink(tempToken, 60);
        if (!verificationLink) {
            return res.status(400).json({ 
                status: false, 
                error: 'Magic link tidak tertangkap dalam 60 detik.',
                data: { email: tempEmail, password: tempPassword, webLoginUrl }
            });
        }

        // 4. Numpang verifikasi & aktifkan pro ke /api/amgen
        const verifyRes = await axios.post(`${baseUrl}/api/amgen`, {
            action: 'verify-link',
            email: tempEmail,
            magicLink: verificationLink
        });

        if (!verifyRes.data || !verifyRes.data.status) {
            throw new Error('Gagal verifikasi lisensi pro via amgen.');
        }

        return res.status(200).json({
            status: true,
            message: 'Auto 1 Click Berhasil!',
            data: {
                email: tempEmail,
                password: tempPassword,
                webLoginUrl: webLoginUrl,
                ...verifyRes.data.data
            }
        });

    } catch (err) {
        return res.status(500).json({ 
            status: false, 
            error: err.response?.data?.error || err.message 
        });
    }
};
