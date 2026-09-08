/**
 * AlwaysCodexScraper.js (Updated with Smart Delay / Jeda)
 */

const { ProxyAgent, fetch: undiciFetch } = require("undici");

const BASE   = "https://am.alwayscodex.eu.cc";
const MAILTM = "https://api.mail.tm";
const UA     = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd   = (n)  => Math.random().toString(36).slice(2, 2 + n);

class AlwaysCodexScraper {
  constructor() {
    this.tasks = new Map();
    this.myProxies = [
      "31.59.20.176:6754:juhpsipx:i2k650br2j70",
      "31.56.127.193:7684:juhpsipx:i2k650br2j70",
      "45.38.107.97:6014:juhpsipx:i2k650br2j70",
      "198.105.121.200:6462:juhpsipx:i2k650br2j70",
      "64.137.96.74:6641:juhpsipx:i2k650br2j70",
      "198.23.243.226:6361:juhpsipx:i2k650br2j70",
      "38.154.185.97:6370:juhpsipx:i2k650br2j70",
      "84.247.60.125:6095:juhpsipx:i2k650br2j70",
      "142.111.67.146:5611:juhpsipx:i2k650br2j70",
      "191.96.254.138:6185:juhpsipx:i2k650br2j70",
      "31.59.20.176:6754:eibftnxj:d4rn2u01djse",
      "31.56.127.193:7684:eibftnxj:d4rn2u01djse",
      "45.38.107.97:6014:eibftnxj:d4rn2u01djse",
      "198.105.121.200:6462:eibftnxj:d4rn2u01djse",
      "64.137.96.74:6641:eibftnxj:d4rn2u01djse",
      "198.23.243.226:6361:eibftnxj:d4rn2u01djse",
      "38.154.185.97:6370:eibftnxj:d4rn2u01djse",
      "84.247.60.125:6095:eibftnxj:d4rn2u01djse",
      "142.111.67.146:5611:eibftnxj:d4rn2u01djse",
      "191.96.254.138:6185:eibftnxj:d4rn2u01djse",
      "31.59.20.176:6754:ahxrzady:5726xtgodvoi",
      "31.56.127.193:7684:ahxrzady:5726xtgodvoi",
      "45.38.107.97:6014:ahxrzady:5726xtgodvoi",
      "198.105.121.200:6462:ahxrzady:5726xtgodvoi",
      "64.137.96.74:6641:ahxrzady:5726xtgodvoi",
      "198.23.243.226:6361:ahxrzady:5726xtgodvoi",
      "38.154.185.97:6370:ahxrzady:5726xtgodvoi",
      "84.247.60.125:6095:ahxrzady:5726xtgodvoi",
      "142.111.67.146:5611:ahxrzady:5726xtgodvoi",
      "191.96.254.138:6185:ahxrzady:5726xtgodvoi",
      "31.59.20.176:6754:uqsvvrch:4rqobr3h21s8",
      "31.56.127.193:7684:uqsvvrch:4rqobr3h21s8",
      "45.38.107.97:6014:uqsvvrch:4rqobr3h21s8",
      "198.105.121.200:6462:uqsvvrch:4rqobr3h21s8",
      "64.137.96.74:6641:uqsvvrch:4rqobr3h21s8",
      "198.23.243.226:6361:uqsvvrch:4rqobr3h21s8",
      "38.154.185.97:6370:uqsvvrch:4rqobr3h21s8",
      "84.247.60.125:6095:uqsvvrch:4rqobr3h21s8",
      "142.111.67.146:5611:uqsvvrch:4rqobr3h21s8",
      "191.96.254.138:6185:uqsvvrch:4rqobr3h21s8",
      "31.59.20.176:6754:wdocdklj:q3orekw4epmk",
      "45.38.107.97:6014:wdocdklj:q3orekw4epmk",
      "198.105.121.200:6462:wdocdklj:q3orekw4epmk",
      "64.137.96.74:6641:wdocdklj:q3orekw4epmk",
      "198.23.243.226:6361:wdocdklj:q3orekw4epmk",
      "38.154.185.97:6370:wdocdklj:q3orekw4epmk",
      "84.247.60.125:6095:wdocdklj:q3orekw4epmk",
      "142.111.67.146:5611:wdocdklj:q3orekw4epmk",
      "191.96.254.138:6185:wdocdklj:q3orekw4epmk",
      "31.58.9.4:6077:wdocdklj:q3orekw4epmk",
      "31.59.20.176:6754:ipdlbxgz:hw6ipkv3wvdk",
      "45.38.107.97:6014:ipdlbxgz:hw6ipkv3wvdk",
      "198.105.121.200:6462:ipdlbxgz:hw6ipkv3wvdk",
      "64.137.96.74:6641:ipdlbxgz:hw6ipkv3wvdk",
      "198.23.243.226:6361:ipdlbxgz:hw6ipkv3wvdk",
      "38.154.185.97:6370:ipdlbxgz:hw6ipkv3wvdk",
      "84.247.60.125:6095:ipdlbxgz:hw6ipkv3wuas",
      "142.111.67.146:5611:ipdlbxgz:hw6ipkv3wvdk",
      "191.96.254.138:6185:ipdlbxgz:hw6ipkv3wvdk",
      "31.58.9.4:6077:ipdlbxgz:hw6ipkv3wvdk"
    ];
  }

  async loadProxyList() {
    return this.myProxies;
  }

  async findWorkingProxy() {
    const list = await this.loadProxyList();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    for (const pStr of list) {
      try {
        const [ip, port, user, pass] = pStr.split(":");
        const proxyUrl = `http://${user}:${pass}@${ip}:${port}`;
        const agent = new ProxyAgent(proxyUrl);

        const res = await undiciFetch(BASE + "/api/auth/register", {
          method: "POST",
          dispatcher: agent,
          headers: { "user-agent": UA, "content-type": "application/json", origin: BASE, referer: BASE + "/" },
          body: JSON.stringify({ username: "probe" + rnd(6), password: "Pass" + rnd(8) }),
          signal: AbortSignal.timeout(6000),
        });
        const j = await res.json().catch(() => null);
        if (res.status === 200 || j?.success) {
          return { agent, url: pStr };
        }
        // Kasih jeda tipis antar pengecekan proxy agar tidak spam
        await sleep(500);
      } catch { 
        // Lanjut ke proxy berikutnya
      }
    }
    return null;
  }

  async createMailTm() {
    const dRes = await undiciFetch(MAILTM + "/domains", {
      headers: { accept: "application/json", "user-agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    const arr = await dRes.json();
    const dom = Array.isArray(arr) ? arr[0]?.domain : arr?.["hydra:member"]?.[0]?.domain;
    if (!dom) throw new Error("mail.tm: tidak ada domain yang tersedia");

    const address  = "reydev" + rnd(6) + "@" + dom;
    const password = "Pass" + rnd(8);

    const acc = await undiciFetch(MAILTM + "/accounts", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify({ address, password }),
      signal: AbortSignal.timeout(10000),
    });
    if (!acc.ok && acc.status !== 201) throw new Error("mail.tm akun gagal: " + acc.status);

    await sleep(1000); // Jeda sebelum request token

    const tok = await undiciFetch(MAILTM + "/token", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify({ address, password }),
      signal: AbortSignal.timeout(10000),
    });
    const tj = await tok.json();
    if (!tj?.token) throw new Error("mail.tm token gagal");
    return { address, password, token: tj.token };
  }

  // Poll inbox dengan jeda bertahap (Delay 4 detik per request biar gak spamming API mail.tm)
  async pollInbox(mailToken, timeoutSec = 70) {
    const deadline = Date.now() + timeoutSec * 1000;
    while (Date.now() < deadline) {
      await sleep(4000); // Jeda 4 detik sebelum request ulang ke inbox
      try {
        const r = await undiciFetch(MAILTM + "/messages", {
          headers: { authorization: "Bearer " + mailToken, "user-agent": UA },
          signal: AbortSignal.timeout(10000),
        });
        const j = await r.json();
        for (const msg of j?.["hydra:member"] ?? []) {
          const d = await undiciFetch(MAILTM + "/messages/" + msg.id, {
            headers: { authorization: "Bearer " + mailToken, "user-agent": UA },
            signal: AbortSignal.timeout(10000),
          });
          const dm = await d.json();
          const raw = JSON.stringify(dm);
          const i = raw.indexOf("https://alight-creative.firebaseapp.com");
          if (i !== -1) {
            let link = raw.slice(i).split("'\"")[0].split("\"")[0];
            link = link.replace(/\u0026/g, "&").replace(/&amp;/g, "&");
            return link;
          }
        }
      } catch {
        // Abaikan error jaringan sementara saat polling, lanjut loop berikutnya
      }
    }
    throw new Error("inbox timeout — email verifikasi tidak masuk");
  }

  makeReq(proxy) {
    return async (url, opts = {}) => {
      const r = await undiciFetch(url, {
        ...opts,
        dispatcher: proxy.agent,
        headers: { "user-agent": UA, ...(opts.headers || {}) },
        signal: opts.signal ?? AbortSignal.timeout(15000),
      });
      let json = null;
      try { json = await r.json(); } catch {}
      const cookie = r.headers.getSetCookie?.().map(c => c.split(";")[0]).join("; ") || "";
      return { status: r.status, json, cookie };
    };
  }

  async generateAccount() {
    const proxy = await this.findWorkingProxy();
    if (!proxy) throw new Error("Tidak ada proxy privat yang aktif/works.");

    const req  = this.makeReq(proxy);
    const user = "shk" + rnd(6);
    const pass = "Pass" + rnd(8);

    const reg = await req(BASE + "/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE, referer: BASE + "/" },
      body: JSON.stringify({ username: user, password: pass }),
    });
    if (!reg.json?.success) throw new Error("Register gagal: " + JSON.stringify(reg.json));

    await sleep(2000); // Jeda sebelum login
    const lg = await req(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
    });
    const cookie = lg.cookie;
    if (!cookie) throw new Error("Login gagal (cookie kosong)");

    const { address, password: mailPass, token: mailToken } = await this.createMailTm();

    await sleep(1500); // Jeda sebelum request send-link
    const sl = await req(BASE + "/api/am/send-link", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ email: address }),
    });
    if (!sl.json?.success) throw new Error("Send-link gagal: " + JSON.stringify(sl.json));

    const magicLink = await this.pollInbox(mailToken);

    await sleep(1500); // Jeda sebelum claim
    const cp = await req(BASE + "/api/am/claim-premium", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ email: address, magicLink }),
    });
    if (!cp.json?.success) throw new Error("Claim gagal: " + JSON.stringify(cp.json));

    return {
      email: address,
      emailPassword: mailPass,
      login: "https://mail.tm",
      codeorder: cp.json?.codeorder ?? null,
      premium: true,
    };
  }

  createTask() {
    const taskId = rnd(10);
    this.tasks.set(taskId, { status: "processing", progress: "Mengecek proxy privat..." });

    this.generateAccount().then(result => {
      this.tasks.set(taskId, { status: "completed", data: result });
    }).catch(err => {
      this.tasks.set(taskId, { status: "failed", message: err.message });
    });

    return { taskId };
  }

  checkTask(id) {
    const task = this.tasks.get(id);
    if (!task) return { status: false, message: "Task ID tidak ditemukan." };
    return { status: true, ...task };
  }
}

module.exports = AlwaysCodexScraper;
