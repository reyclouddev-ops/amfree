const https = require('https');

const BASE = 'https://react.zfile.web.id';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function genSessionId() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'zx_';
  for (let i = 0; i < 16; i++) id += c[Math.floor(Math.random() * c.length)];
  return id;
}

function parseCookies(headers, cookiesObj) {
  const sc = headers['set-cookie'];
  if (!sc) return;
  const arr = Array.isArray(sc) ? sc : [sc];
  for (const c of arr) {
    const m = c.match(/^([^=]+)=([^;]+)/);
    if (m) cookiesObj[m[1]] = m[2];
  }
}

function cookieHeader(cookiesObj) {
  return Object.entries(cookiesObj).map(([k,v]) => `${k}=${v}`).join('; ');
}

function req(method, path, body, cookiesObj, extra = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path);
    const hdrs = {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
      'Origin': BASE,
      'Referer': BASE + '/',
      ...extra,
    };
    const ch = cookieHeader(cookiesObj);
    if (ch) hdrs['Cookie'] = ch;

    const opts = {
      method,
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      headers: hdrs,
    };

    const r = https.request(opts, (res) => {
      parseCookies(res.headers, cookiesObj);
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    r.on('error', reject);
    r.setTimeout(30000, () => { r.destroy(); reject(new Error('Timeout')); });
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

async function getTicket(sid, cookiesObj) {
  const data = await req('GET', BASE + '/api/challenge', null, cookiesObj, {
    'X-Session-Id': sid,
  });
  if (!data.ok) throw new Error('Challenge gagal');
  return data;
}

async function sendReact(url, reactions, ticket, sid, cookiesObj) {
  return req('POST', BASE + '/api/react', {
    url, reactions, ticket,
  }, cookiesObj, {
    'Content-Type': 'application/json',
    'X-ZX-Request': 'zx-reactch',
    'X-Session-Id': sid,
  });
}

module.exports = async function handler(reqBody, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (reqBody.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (reqBody.method !== 'POST') {
        return res.status(405).json({ status: false, error: 'Method not allowed, use POST' });
    }

    const { url, emojis, count } = reqBody.body || {};

    if (!url || !emojis) {
        return res.status(400).json({ status: false, error: 'Parameter url dan emojis wajib diisi!' });
    }

    const emojiArray = Array.isArray(emojis) ? emojis : emojis.split(',').map(e => e.trim());
    const totalCount = parseInt(count) || 1;

    let ok = 0, fail = 0;
    const results = [];

    for (let i = 1; i <= totalCount; i++) {
        const sid = genSessionId();
        const cookiesObj = {};
        try {
            const challenge = await getTicket(sid, cookiesObj);
            const ticket = challenge.ticket;
            const delay = Math.max(2500, challenge.minAgeMs || 2500);
            await sleep(delay);

            const resReact = await sendReact(url, emojiArray, ticket, sid, cookiesObj);

            results.push({
                index: i,
                success: resReact.success || false,
                message: resReact.message || 'Unknown',
            });

            if (resReact.success) ok++;
            else fail++;
        } catch (e) {
            results.push({ index: i, success: false, message: e.message });
            fail++;
        }
        if (i < totalCount) await sleep(1000);
    }

    return res.status(200).json({
        status: ok > 0,
        creator: 'ReyCode',
        target: url,
        emojis: emojiArray,
        total: totalCount,
        success: ok,
        failed: fail,
        results: results,
    });
};
