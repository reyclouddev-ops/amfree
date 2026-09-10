const https = require('https');
const axios = require('axios');

// Target API AkunLama / Mail Backend
const BASE_URL = 'https://akunlama.com/api';
const DOMAIN = 'akunlama.com';
const CREATOR = 'Lann';

// Helper pembersih string / recipient
function cleanRecipient(emailOrUsername) {
    return (emailOrUsername || '').replace(`@${DOMAIN}`, '').trim();
}

// Generator nama acak bertema kucing dengan tambahan 2 digit angka random biar unik
const ADJECTIVES = ['happy', 'sleepy', 'clever', 'swift', 'brave', 'calm', 'wild', 'gentle', 'lucky', 'proud', 'cozy', 'fuzzy'];
const ANIMALS = ['kitten', 'cat', 'tiger', 'lion', 'panther', 'cheetah', 'lynx', 'puma', 'jaguar', 'leopard'];

function generateRandomName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 90) + 10; // Angka random 2 digit (10 - 99)
    return {
        username: `${adj}-${animal}-${num}`,
        animalName: `${adj} ${animal}`
    };
}

// Parser HTML & Ekstraktor (Lann's Core Functions)
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

function extractOtp(text) {
    if (!text) return null;
    const labeled = text.match(/(?:otp|code|verification|kode|verifikasi)[\s:=#\-]+([0-9]{4,8})/i);
    if (labeled) return labeled[1];
    const standalone = text.match(/\b(?!(?:19\d\d|20\d\d)\b)([0-9]{4,8})\b/);
    return standalone ? standalone[1] : null;
}

function extractLinks(html) {
    if (typeof html !== 'string') return [];
    const links = [];
    const regex = /href=["'](https?:\/\/[^"']+)["']/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const matchedUrl = match[1].replace(/&amp;/g, '&');
        if (!links.includes(matchedUrl)) {
            links.push(matchedUrl);
        }
    }
    return links;
}

// HTTP Request helper menggunakan HTTPS GET standar
function requestApi(targetUrl) {
    return new Promise((resolve, reject) => {
        https.get(targetUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

async function listInbox(username) {
    const recipient = cleanRecipient(username);
    const reqUrl = `${BASE_URL}/list?recipient=${encodeURIComponent(recipient)}`;
    const res = await requestApi(reqUrl);
    return Array.isArray(res) ? res : [];
}

async function getEmailDetail(region, key) {
    const metaUrl = `${BASE_URL}/getKey?region=${encodeURIComponent(region)}&key=${encodeURIComponent(key)}`;
    const htmlUrl = `${BASE_URL}/getHtml?region=${encodeURIComponent(region)}&key=${encodeURIComponent(key)}`;
    const [meta, html] = await Promise.all([
        requestApi(metaUrl),
        requestApi(htmlUrl)
    ]);
    const rawHtml = typeof html === 'string' ? html : JSON.stringify(html);
    const textContent = stripHtml(rawHtml);
    const links = extractLinks(rawHtml);
    const possibleOtp = extractOtp(textContent);
    return { meta, html: rawHtml, text: textContent, links, possibleOtp };
}

// Fungsi menunggu link verifikasi masuk via scraper AkunLama
async function waitForVerificationLink(username, timeoutSec = 60) {
    const clean = cleanRecipient(username);
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
                    const allLinks = detail.links || [];
                    const targetLink = allLinks.find(l => /oobCode|verify|auth|activate|confirm/i.test(l)) || allLinks[0];
                    
                    if (targetLink) return targetLink;
                }
            }
        } catch (_) {}
        await new Promise(resolve => setTimeout(resolve, 4000));
    }
    return null;
}

// Handler Utama Serverless / Vercel / Express
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const query = req.method === 'GET' ? req.query : (req.body || {});
    const action = query.action;
    const requestedUser = query.username || query.user;

    try {
        if (req.method === 'GET' && !action && !requestedUser) {
            return res.status(200).json({ 
                status: true, 
                creator: CREATOR,
                domain: DOMAIN,
                message: 'AkunLama Scraper Wrapper Active (Card Response Format)' 
            });
        }

        if (req.method !== 'POST' && !requestedUser && req.method === 'GET') {
            return res.status(400).json({ status: false, error: 'Parameter username atau action POST diperlukan.' });
        }

        // Tentukan username & animal jika auto
        let username, animalName = null;
        if (requestedUser) {
            username = cleanRecipient(requestedUser);
            animalName = "Custom User Input";
        } else {
            const generated = generateRandomName();
            username = generated.username;
            animalName = generated.animalName;
        }

        const tempEmail = `${username}@${DOMAIN}`;
        const webLoginUrl = `https://${DOMAIN}`;

        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;

        // 1. Kirim magic link ke /api/amgen
        const sendRes = await axios.post(`${baseUrl}/api/amgen`, {
            action: 'send-link',
            email: tempEmail
        }, { timeout: 10000 }).catch(err => ({ data: { status: false, error: err.message } }));

        if (!sendRes.data || !sendRes.data.status) {
            throw new Error('Gagal mengirim magic link via amgen: ' + (sendRes.data?.error || 'Unknown error'));
        }

        // 2. Tunggu link verifikasi masuk lewat scraper
        const verificationLink = await waitForVerificationLink(username, 60);
        if (!verificationLink) {
            return res.status(400).json({ 
                status: false, 
                error: 'Magic link tidak tertangkap dalam 60 detik.',
                data: { email: tempEmail, webLoginUrl }
            });
        }

        // 3. Verifikasi & aktifkan pro ke /api/amgen
        const verifyRes = await axios.post(`${baseUrl}/api/amgen`, {
            action: 'verify-link',
            email: tempEmail,
            magicLink: verificationLink
        }, { timeout: 10000 }).catch(err => ({ data: { status: false, error: err.message } }));

        if (!verifyRes.data || !verifyRes.data.status) {
            throw new Error('Gagal verifikasi lisensi pro via amgen.');
        }

        // Format Respon Card Terstruktur
        return res.status(200).json({
            status: true,
            creator: CREATOR,
            message: 'Auto 1 Click Berhasil!',
            card: {
                email: tempEmail,
                weblogin: webLoginUrl,
                selamat_kamu_mendapatkan_animal: animalName,
                verification_link: verificationLink,
                panduan_dan_cara_login: [
                    "1. Simpan dan amankan alamat email di atas untuk keperluan akses selanjutnya.",
                    "2. Gunakan situs web login yang tertera untuk memantau kotak masuk (inbox) atau melihat pesan verifikasi baru secara real-time.",
                    "3. Proses aktivasi otomatis telah selesai dan akun Anda berhasil terverifikasi penuh."
                ],
                extra_data: verifyRes.data.data || {}
            }
        });

    } catch (err) {
        return res.status(500).json({ 
            status: false, 
            creator: CREATOR,
            error: err.response?.data?.error || err.message 
        });
    }
};
