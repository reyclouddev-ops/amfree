/**
 * API Route: /api/nunodrama
 * Optimized Robust NunoDrama & Donghub Scraper Backend
 */

const axios = require('axios');
const cheerio = require('cheerio');
const CryptoJS = require('crypto-js');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const BASE_URL = process.env.NUNODRAMA_BASE_URL || 'https://nunodrama.my.id';
let currentApiToken = process.env.NUNODRAMA_API_TOKEN || 'a3VjaW5nIGthbXB1bmc=';
let currentSecretKey = process.env.NUNODRAMA_SECRET_KEY || 'Nuno-secret';

const cookieJar = new CookieJar();
const httpClient = wrapper(
  axios.create({
    jar: cookieJar,
    withCredentials: true,
  })
);

function getDefaultHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'x-api-token': currentApiToken,
    Referer: `${BASE_URL}/`,
    Origin: BASE_URL,
  };
}

async function ensurePlatformLanguage(platform, lang = 'in') {
  const plat = platform.toLowerCase().trim();
  try {
    await httpClient.get(`${BASE_URL}/api/${plat}/set_language?lang=${lang}`, {
      headers: getDefaultHeaders(),
      timeout: 5000,
    });
  } catch (e) {}
}

function decryptNunoData(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') return encryptedData;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, currentSecretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return encryptedData;
    return JSON.parse(decrypted);
  } catch {
    return encryptedData;
  }
}

async function requestApi(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  try {
    const res = await httpClient.get(url, {
      headers: getDefaultHeaders(),
      timeout: 15000,
    });
    let payload = res.data;

    if (payload && payload.data && typeof payload.data === 'string') {
      const decrypted = decryptNunoData(payload.data);
      if (typeof decrypted === 'object') payload = { ...payload, data: decrypted };
    } else if (payload && typeof payload === 'string') {
      const decrypted = decryptNunoData(payload);
      if (typeof decrypted === 'object') payload = decrypted;
    }
    return payload;
  } catch (err) {
    throw new Error(`[API Error] ${endpoint}: ${err.message}`);
  }
}

// ================= DONGHUB SCRAPER =================
class DonghubScraper {
  constructor() {
    this.baseUrl = 'https://donghub.vip';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };
  }

  getSlug(urlStr) {
    if (!urlStr) return '';
    try {
      const url = new URL(urlStr);
      const parts = url.pathname.replace(/\/+$/, '').split('/');
      return parts[parts.length - 1] || '';
    } catch (e) {
      const parts = urlStr.split('?')[0].replace(/\/+$/, '').split('/');
      return parts[parts.length - 1] || '';
    }
  }

  async fetchHtml(url) {
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`Failed fetch ${url}`);
    return await res.text();
  }

  async getHome() {
    const html = await this.fetchHtml(`${this.baseUrl}/`);
    const $ = cheerio.load(html);
    const dramas = [];

    $('.releases.latesthome').next('.listupd').find('article.bs').each((i, el) => {
      const a = $(el).find('.bsx a');
      const link = a.attr('href') || '';
      const titleAttr = a.attr('title') || '';
      const cover = a.find('img').attr('src') || a.find('img').attr('data-src') || '';
      const episode = a.find('.limit .bt .epx').text().trim();
      const tt = a.find('.tt');
      const seriesTitle = tt.clone().children().remove().end().text().trim();

      dramas.push({
        id: this.getSlug(link),
        title: seriesTitle || titleAttr,
        cover,
        totalEpisodes: episode || 'Ongoing',
        platform: 'donghua'
      });
    });

    return { status: 'success', platform: 'donghua', dramas };
  }

  async search(query) {
    const html = await this.fetchHtml(`${this.baseUrl}/?s=${encodeURIComponent(query)}`);
    const $ = cheerio.load(html);
    const dramas = [];

    $('.listupd article.bs').each((i, el) => {
      const a = $(el).find('.bsx a');
      const link = a.attr('href') || '';
      const title = a.attr('title') || '';
      const cover = a.find('img').attr('src') || a.find('img').attr('data-src') || '';
      const episode = a.find('.limit .bt .epx').text().trim();

      dramas.push({
        id: this.getSlug(link),
        title,
        cover,
        totalEpisodes: episode || 'Selesai',
        platform: 'donghua'
      });
    });

    return { status: 'success', platform: 'donghua', dramas };
  }

  async getDetail(idOrSlug) {
    const html = await this.fetchHtml(`${this.baseUrl}/${idOrSlug}/`);
    const $ = cheerio.load(html);
    const title = $('.entry-title').text().trim();
    const cover = $('.thumb img').attr('src') || $('.thumb img').attr('data-src') || '';
    const synopsis = $('.bixbox.synp .entry-content').text().trim();

    const episodes = [];
    $('.eplister ul li').each((i, el) => {
      const a = $(el).find('a');
      const link = a.attr('href') || '';
      const num = $(el).find('.epl-num').text().trim();
      const epTitle = $(el).find('.epl-title').text().trim();

      episodes.push({
        index: i + 1,
        chapterId: this.getSlug(link),
        chapterName: epTitle ? `Ep ${num} - ${epTitle}` : `Episode ${num}`,
      });
    });

    return { status: 'success', title, cover, synopsis, totalEpisodes: episodes.length, episodes, platform: 'donghua' };
  }

  async getStream(chapterSlug) {
    const html = await this.fetchHtml(`${this.baseUrl}/${chapterSlug}/`);
    const $ = cheerio.load(html);
    let streamUrl = '';

    $('select.mirror option').each((i, el) => {
      const base64Value = $(el).val();
      if (!base64Value || streamUrl) return;
      try {
        const decoded = Buffer.from(base64Value, 'base64').toString('utf8');
        const match = decoded.match(/src=["']([^"']+)["']/) || decoded.match(/https?:\/\/[^"'\s]+/);
        if (match) streamUrl = match[1] || match[0];
      } catch (e) {}
    });

    return { status: 'success', streamUrl: streamUrl || '' };
  }
}

const donghub = new DonghubScraper();

// ================= HANDLERS =================
async function getFeed(platform = 'dramaverse') {
  const plat = platform.toLowerCase().trim();
  if (plat === 'donghua') return await donghub.getHome();

  await ensurePlatformLanguage(plat, 'in');
  const res = await requestApi(`/api/${plat}/foryou?page=1&limit=24`);
  
  let rawList = [];
  if (Array.isArray(res)) rawList = res;
  else if (Array.isArray(res?.data)) rawList = res.data;
  else if (Array.isArray(res?.data?.list)) rawList = res.data.list;
  else if (Array.isArray(res?.data?.items)) rawList = res.data.items;
  else if (Array.isArray(res?.list)) rawList = res.list;

  const dramas = rawList.map((item, idx) => ({
    id: String(item.bookId || item.id || item.drama_id || item.shortPlayId || item.work_id || item.book_id || idx + 1),
    title: item.bookName || item.title || item.name || item.book_title || 'Untitled',
    cover: item.cover || item.book_pic || item.cover_url || item.poster || '',
    totalEpisodes: item.chapter_count || item.total_episodes || item.num_videos || 0,
    platform: plat,
  }));

  return { status: 'success', platform: plat, dramas };
}

async function searchDrama(query, platform = 'dramaverse') {
  const plat = platform.toLowerCase().trim();
  if (plat === 'donghua') return await donghub.search(query);

  await ensurePlatformLanguage(plat, 'in');
  const res = await requestApi(`/api/${plat}/search?keyword=${encodeURIComponent(query)}`);

  let rawList = [];
  if (Array.isArray(res)) rawList = res;
  else if (Array.isArray(res?.data)) rawList = res.data;
  else if (Array.isArray(res?.data?.list)) rawList = res.data.list;
  else if (Array.isArray(res?.list)) rawList = res.list;

  const dramas = rawList.map((item, idx) => ({
    id: String(item.bookId || item.id || item.drama_id || item.shortPlayId || item.work_id || item.book_id || idx + 1),
    title: item.bookName || item.title || item.name || item.book_title || 'Untitled',
    cover: item.cover || item.book_pic || item.cover_url || item.poster || '',
    totalEpisodes: item.chapter_count || item.total_episodes || item.num_videos || 0,
    platform: plat,
  }));

  return { status: 'success', platform: plat, dramas };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action = 'feed', platform = 'dramaverse', query, id, episode = 1 } = req.query || {};

    if (action === 'feed') return res.status(200).json(await getFeed(platform));
    if (action === 'search') return res.status(200).json(await searchDrama(query || '', platform));
    if (action === 'detail') {
      if (platform === 'donghua') return res.status(200).json(await donghub.getDetail(id));
      const r = await requestApi(`/api/${platform}/detail?book_id=${id}`);
      const data = r?.data || r || {};
      return res.status(200).json({
        status: 'success',
        title: data.bookName || data.title || data.name || 'Untitled',
        cover: data.cover || data.book_pic || '',
        synopsis: data.introduction || data.desc || '-',
        totalEpisodes: data.chapter_count || data.total_episodes || 0,
        platform
      });
    }
    if (action === 'episodes') {
      if (platform === 'donghua') {
        const d = await donghub.getDetail(id);
        return res.status(200).json({ status: 'success', episodes: d.episodes });
      }
      const r = await requestApi(`/api/${platform}/allepisode?book_id=${id}`);
      let list = Array.isArray(r) ? r : (r?.data?.episodes || r?.data || r?.episodes || []);
      const episodes = list.map((ep, idx) => ({
        index: ep.chapterIndex || ep.episode || idx + 1,
        chapterId: String(ep.chapterId || ep.id || idx + 1),
        chapterName: ep.chapterName || ep.name || `Episode ${idx + 1}`
      }));
      return res.status(200).json({ status: 'success', episodes });
    }
    if (action === 'stream') {
      if (platform === 'donghua') return res.status(200).json(await donghub.getStream(id));
      const r = await requestApi(`/api/${platform}/stream?book_id=${id}&episode=${episode}`);
      const s = r?.data || r || {};
      return res.status(200).json({
        status: 'success',
        directPlayUrl: s.playUrl || s.proxyUrl || s.url || ''
      });
    }

    return res.status(400).json({ status: false, error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
