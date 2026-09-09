/**
 * API Route: /api/nunodrama
 * Full Standalone NunoDrama Suite Engine (61+ Platforms) + Donghub Scraper Integration
 */

const axios = require('axios');
const cheerio = require('cheerio');
const CryptoJS = require('crypto-js');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const BASE_URL = process.env.NUNODRAMA_BASE_URL || 'https://nunodrama.my.id';
const API_BASE_URL = process.env.NUNODRAMA_API_URL || 'https://api.nunodrama.my.id';

let currentApiToken = process.env.NUNODRAMA_API_TOKEN || 'a3VjaW5nIGthbXB1bmc=';
let currentSecretKey = process.env.NUNODRAMA_SECRET_KEY || 'Nuno-secret';
let lastDiscoveryTime = 0;
let isDiscovering = false;

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

const INITIAL_LANG_MAP = new Map();

async function ensurePlatformLanguage(platform, lang = 'in') {
  const plat = platform.toLowerCase().trim();
  const cacheKey = `${plat}_${lang}`;
  if (INITIAL_LANG_MAP.has(cacheKey)) return;

  const s = lang === 'pt' ? 'en' : lang;
  let endpoint = `/api/${plat}/set_language?lang=${encodeURIComponent(s)}`;

  try {
    await httpClient.get(`${BASE_URL}${endpoint}`, { headers: getDefaultHeaders(), timeout: 8000 });
    INITIAL_LANG_MAP.set(cacheKey, Date.now());
  } catch {
    INITIAL_LANG_MAP.set(cacheKey, Date.now());
  }
}

async function autoDiscoverTokens(force = false) {
  if (process.env.NUNODRAMA_API_TOKEN && process.env.NUNODRAMA_SECRET_KEY && !force) {
    return { apiToken: currentApiToken, secretKey: currentSecretKey };
  }
  if (!force && Date.now() - lastDiscoveryTime < 60000) {
    return { apiToken: currentApiToken, secretKey: currentSecretKey };
  }
  if (isDiscovering) return { apiToken: currentApiToken, secretKey: currentSecretKey };
  isDiscovering = true;
  lastDiscoveryTime = Date.now();

  try {
    const homeRes = await axios.get(`${BASE_URL}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000,
    });
    const $ = cheerio.load(homeRes.data);
    const scripts = [];
    $('script[src], astro-island[component-url]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('component-url');
      if (src && src.includes('/_astro/')) scripts.push(src);
    });

    for (const scriptPath of scripts) {
      const scriptUrl = scriptPath.startsWith('http') ? scriptPath : `${BASE_URL}${scriptPath}`;
      const scriptRes = await axios.get(scriptUrl, { timeout: 8000 });
      const code = scriptRes.data;
      const tokenMatch = code.match(/([a-zA-Z0-9_$]+)\s*=\s*["']([^"']+)["'],[a-zA-Z0-9_$]+\s*=\s*["']x-api-token["']/);
      const secretMatch = code.match(/_createHelper\([^)]*\),\s*[a-zA-Z0-9_$]+\s*=\s*["']([^"']+)["']/);

      if (tokenMatch?.[2]) currentApiToken = tokenMatch[2];
      if (secretMatch?.[1]) currentSecretKey = secretMatch[1];
    }
  } catch {} finally {
    isDiscovering = false;
  }
  return { apiToken: currentApiToken, secretKey: currentSecretKey };
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

async function requestApi(endpoint, options = {}, retried = false) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const config = {
    headers: { ...getDefaultHeaders(), ...options.headers },
    timeout: options.timeout || 20000,
  };

  try {
    const res = await httpClient.get(url, config);
    let payload = res.data;

    if (payload && payload.data && typeof payload.data === 'string') {
      const decrypted = decryptNunoData(payload.data);
      if (typeof decrypted === 'string' && !retried) {
        await autoDiscoverTokens(true);
        return await requestApi(endpoint, options, true);
      }
      payload = { ...payload, data: decrypted };
    } else if (payload && typeof payload === 'string') {
      const decrypted = decryptNunoData(payload);
      if (typeof decrypted === 'object') payload = decrypted;
    }
    return payload;
  } catch (err) {
    if (!retried && (err.response?.status === 401 || err.response?.status === 403)) {
      await autoDiscoverTokens(true);
      return await requestApi(endpoint, options, true);
    }
    throw new Error(`[NunoDrama API] ${endpoint}: ${err.message}`);
  }
}

// ==========================================
// DONGHUB SCRAPER INTEGRATION CLASS
// ==========================================
class DonghubScraper {
  constructor() {
    this.baseUrl = 'https://donghub.vip';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    };
  }

  getSlug(urlStr) {
    if (!urlStr) return '';
    try {
      const url = new URL(urlStr);
      const pathname = url.pathname.replace(/\/+$/, '').replace(/^\/+/, '');
      const parts = pathname.split('/');
      return parts[parts.length - 1] || '';
    } catch (e) {
      const pathname = urlStr.split('?')[0].replace(/\/+$/, '').replace(/^\/+/, '');
      const parts = pathname.split('/');
      return parts[parts.length - 1] || '';
    }
  }

  async fetchHtml(url) {
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch HTML from ${url}. Status: ${res.status}`);
    }
    return await res.text();
  }

  async getHome() {
    const html = await this.fetchHtml(`${this.baseUrl}/`);
    const $ = cheerio.load(html);

    const latestRelease = [];
    $('.releases.latesthome').next('.listupd').find('article.bs').each((i, el) => {
      const a = $(el).find('.bsx a');
      const link = a.attr('href') || '';
      const titleAttr = a.attr('title') || '';
      const cover = a.find('img').attr('src') || a.find('img').attr('data-src') || '';
      const episode = a.find('.limit .bt .epx').text().trim();
      const type = a.find('.limit .typez').text().trim();
      const tt = a.find('.tt');
      const seriesTitle = tt.clone().children().remove().end().text().trim();
      const episodeTitle = tt.find('h2').text().trim();

      latestRelease.push({
        id: this.getSlug(link),
        platform: 'donghua',
        title: episodeTitle || titleAttr,
        seriesTitle: seriesTitle || titleAttr.replace(/\sEpisode\s\d+.*/i, ''),
        link,
        slug: this.getSlug(link),
        cover,
        totalEpisodes: episode,
        type
      });
    });

    return { status: 'success', platform: 'donghua', total: latestRelease.length, page: 1, dramas: latestRelease };
  }

  async search(query, page = 1) {
    const url = page > 1 
      ? `${this.baseUrl}/page/${page}/?s=${encodeURIComponent(query)}`
      : `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);

    const results = [];
    $('.listupd article.bs').each((i, el) => {
      const a = $(el).find('.bsx a');
      const link = a.attr('href') || '';
      const title = a.attr('title') || '';
      const cover = a.find('img').attr('src') || a.find('img').attr('data-src') || '';
      const type = a.find('.limit .typez').text().trim();
      const episode = a.find('.limit .bt .epx').text().trim();

      results.push({
        id: this.getSlug(link),
        platform: 'donghua',
        title,
        cover,
        totalEpisodes: episode,
        type,
        link,
        slug: this.getSlug(link)
      });
    });

    return { status: 'success', query, platform: 'donghua', total: results.results ? results.results.length : results.length, results };
  }

  async getDetail(slugOrUrl) {
    let url = slugOrUrl;
    if (!url.startsWith('http')) {
      url = `${this.baseUrl}/${slugOrUrl}/`;
    }
    const html = await this.fetchHtml(url);
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
        index: parseInt(num) || i + 1,
        chapterId: this.getSlug(link),
        chapterName: epTitle ? `Episode ${num} - ${epTitle}` : `Episode ${num}`,
        link
      });
    });

    return {
      status: 'success',
      platform: 'donghua',
      id: this.getSlug(url),
      title,
      cover,
      synopsis,
      totalEpisodes: episodes.length,
      episodes
    };
  }

  async getStream(slugOrUrl) {
    let url = slugOrUrl;
    if (!url.startsWith('http')) {
      url = `${this.baseUrl}/${slugOrUrl}/`;
    }
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('.entry-title').text().trim();
    let streamUrl = '';

    $('select.mirror option').each((i, el) => {
      const base64Value = $(el).val();
      if (!base64Value || streamUrl) return;
      try {
        const decodedHtml = Buffer.from(base64Value, 'base64').toString('utf8');
        const iframeMatch = decodedHtml.match(/src=["']([^"']+)["']/);
        if (iframeMatch) {
          streamUrl = iframeMatch[1];
        }
      } catch (e) {}
    });

    return {
      status: 'success',
      platform: 'donghua',
      title,
      quality: 'HD',
      streamUrl: streamUrl || '',
      directPlayUrl: streamUrl || ''
    };
  }
}

const donghub = new DonghubScraper();

// ==========================================
// NUNODRAMA CORE FUNCTIONS
// ==========================================
async function getFeed(platform = 'dramaverse', options = {}) {
  const platId = (platform || 'dramaverse').toLowerCase().trim();
  
  if (platId === 'donghua') {
    return await donghub.getHome();
  }

  const page = options.page || 1;
  const limit = options.limit || 21;

  await ensurePlatformLanguage(platId, 'in');

  let endpoint = `/api/${platId}/foryou?page=${page}&limit=${limit}`;
  if (platId === 'stardust') endpoint = `/api/stardust/hot?page=${page}&page_size=${limit}`;
  else if (platId === 'drakorid') endpoint = `/api/drakorid/foryou`;
  else if (platId === 'melolo') endpoint = `/api/melolo/trending`;
  else if (platId === 'toonshort') endpoint = `/api/toonshort/popular`;

  const raw = await requestApi(endpoint);
  let rawList = [];

  if (Array.isArray(raw)) rawList = raw;
  else if (Array.isArray(raw?.data)) rawList = raw.data;
  else if (Array.isArray(raw?.data?.list)) rawList = raw.data.list;
  else if (Array.isArray(raw?.data?.items)) rawList = raw.data.items;

  const dramas = rawList.map((item, idx) => ({
    index: idx + 1,
    platform: platId,
    id: String(item.bookId || item.id || item.drama_id || item.shortPlayId || item.work_id || item.book_id || idx + 1),
    title: item.bookName || item.title || item.name || item.book_title || 'Untitled',
    cover: item.cover || item.book_pic || item.cover_url || item.poster || '',
    totalEpisodes: item.chapter_count || item.total_episodes || item.num_videos || 0,
    synopsis: item.introduction || item.desc || item.synopsis || '-',
  }));

  return { status: 'success', platform: platId, total: dramas.length, page, dramas };
}

async function searchDrama(query, options = {}) {
  const cleanQuery = String(query).trim();
  const targetPlatform = options.platform ? options.platform.toLowerCase().trim() : 'dramaverse';

  if (targetPlatform === 'donghua') {
    return await donghub.search(cleanQuery);
  }

  await ensurePlatformLanguage(targetPlatform, 'in');
  let endpoint = `/api/${targetPlatform}/search?keyword=${encodeURIComponent(cleanQuery)}`;
  if (['netshort', 'flickreels', 'freereels', 'melolo'].includes(targetPlatform)) {
    endpoint = `/api/${targetPlatform}/search?query=${encodeURIComponent(cleanQuery)}`;
  }

  const raw = await requestApi(endpoint);
  let items = [];
  if (Array.isArray(raw)) items = raw;
  else if (Array.isArray(raw?.data)) items = raw.data;
  else if (Array.isArray(raw?.data?.list)) items = raw.data.list;
  else if (Array.isArray(raw?.dramas)) items = raw.dramas;

  const formatted = items.map((item, idx) => ({
    index: idx + 1,
    platform: targetPlatform,
    id: String(item.bookId || item.id || item.drama_id || item.shortPlayId || item.work_id || item.book_id || idx + 1),
    title: item.bookName || item.title || item.name || item.book_title || 'Untitled',
    cover: item.cover || item.book_pic || item.cover_url || item.poster || '',
    synopsis: item.introduction || item.desc || item.synopsis || '-',
    totalEpisodes: item.chapter_count || item.total_episodes || item.num_videos || 0,
  }));

  return { status: 'success', query: cleanQuery, platform: targetPlatform, total: formatted.length, results: formatted };
}

async function getDramaDetail(platform, id) {
  const plat = String(platform).toLowerCase().trim();
  const bookId = String(id).trim();

  if (plat === 'donghua') {
    return await donghub.getDetail(bookId);
  }

  await ensurePlatformLanguage(plat, 'in');

  let endpoint = `/api/${plat}/detail?book_id=${encodeURIComponent(bookId)}`;
  if (['shortmax', 'storyreel', 'vibeshort'].includes(plat)) {
    endpoint = `/api/${plat}/detail?drama_id=${encodeURIComponent(bookId)}`;
  } else if (plat === 'netshort') {
    endpoint = `/api/netshort/detail?shortPlayId=${encodeURIComponent(bookId)}`;
  } else if (['flickreels', 'freereels'].includes(plat)) {
    endpoint = `/api/${plat}/detail?id=${encodeURIComponent(bookId)}`;
  } else if (plat === 'vigloo') {
    endpoint = `/api/vigloo/detail?video_id=${encodeURIComponent(bookId)}`;
  } else if (plat === 'moboreels') {
    endpoint = `/api/moboreels/detail?series_id=${encodeURIComponent(bookId)}`;
  } else if (['melolo', 'velolo'].includes(plat)) {
    endpoint = `/api/${plat}/detail?bookId=${encodeURIComponent(bookId)}`;
  }

  const res = await requestApi(endpoint);
  const data = res?.data || res || {};

  return {
    status: 'success',
    platform: plat,
    id: bookId,
    title: data.bookName || data.title || data.name || data.shortPlayName || data.book_title || 'Untitled',
    cover: data.cover || data.book_pic || data.cover_url || data.poster || '',
    synopsis: data.introduction || data.desc || data.description || data.synopsis || '-',
    totalEpisodes: data.chapter_count || data.total_episodes || data.num_videos || 0,
  };
}

async function getEpisodes(platform, id) {
  const plat = String(platform).toLowerCase().trim();
  const bookId = String(id).trim();

  if (plat === 'donghua') {
    const detail = await donghub.getDetail(bookId);
    return {
      status: 'success',
      platform: 'donghua',
      bookId,
      totalEpisodes: detail.episodes.length,
      episodes: detail.episodes
    };
  }

  await ensurePlatformLanguage(plat, 'in');

  let endpoint = `/api/${plat}/allepisode?book_id=${encodeURIComponent(bookId)}`;
  if (['shortmax', 'storyreel', 'goodshort', 'vibeshort'].includes(plat)) {
    endpoint = `/api/${plat}/episode?drama_id=${encodeURIComponent(bookId)}&book_id=${encodeURIComponent(bookId)}`;
  } else if (plat === 'moboreels') {
    endpoint = `/api/moboreels/allepisode?series_id=${encodeURIComponent(bookId)}`;
  }

  const res = await requestApi(endpoint);
  let rawEpList = [];

  if (Array.isArray(res)) rawEpList = res;
  else if (Array.isArray(res?.data?.episodes)) rawEpList = res.data.episodes;
  else if (Array.isArray(res?.data)) rawEpList = res.data;
  else if (Array.isArray(res?.episodes)) rawEpList = res.episodes;

  const episodes = rawEpList.map((ep, idx) => ({
    index: ep.chapterIndex || ep.episode || ep.episode_index || idx + 1,
    chapterId: String(ep.chapterId || ep.id || ep.episode_id || idx + 1),
    chapterName: ep.chapterName || ep.name || ep.title || `Episode ${idx + 1}`,
  }));

  return { status: 'success', platform: plat, bookId, totalEpisodes: episodes.length, episodes };
}

async function getStream(platform, id, episode = 1) {
  const plat = String(platform).toLowerCase().trim();
  const bookId = String(id).trim();
  const ep = parseInt(episode, 10) || 1;

  if (plat === 'donghua') {
    // id untuk donghua bisa berupa slug episode langsung (misal: "battle-through-the-heavens-season-5-episode-100")
    return await donghub.getStream(bookId);
  }

  await ensurePlatformLanguage(plat, 'in');

  let endpoint = `/api/${plat}/stream?book_id=${encodeURIComponent(bookId)}&episode=${ep}`;
  if (['shortmax', 'storyreel', 'vibeshort'].includes(plat)) {
    endpoint = `/api/${plat}/stream?drama_id=${encodeURIComponent(bookId)}&episode_index=${ep}&json=1`;
  } else if (plat === 'netshort') {
    endpoint = `/api/netshort/stream?book_id=${encodeURIComponent(bookId)}&episode=${ep}`;
  } else if (plat === 'flickreels') {
    endpoint = `/api/flickreels/stream?book_id=${encodeURIComponent(bookId)}&chapter_id=${ep}`;
  } else if (plat === 'goodshort') {
    endpoint = `/api/goodshort/stream?book_id=${encodeURIComponent(bookId)}&episode_id=${ep}&server=1`;
  }

  const res = await requestApi(endpoint);
  const streamData = res?.data || res || {};

  const mainUrl = streamData.playUrl || streamData.proxyUrl || streamData.url || '';
  const directProxyUrl = streamData.proxyUrl || streamData.playUrl || mainUrl;

  return {
    status: 'success',
    platform: plat,
    bookId,
    episode: ep,
    quality: streamData.quality || '720p',
    streamUrl: mainUrl,
    directPlayUrl: directProxyUrl,
  };
}

// ==========================================
// VERCEL SERVERLESS HANDLER
// ==========================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: false, error: 'Method not allowed' });

  try {
    const { action, platform = 'dramaverse', query, id, episode } = req.query || {};

    if (action === 'feed') {
      const data = await getFeed(platform);
      return res.status(200).json(data);
    }
    if (action === 'search') {
      if (!query) return res.status(400).json({ status: false, error: 'Parameter query wajib diisi!' });
      const data = await searchDrama(query, { platform });
      return res.status(200).json(data);
    }
    if (action === 'detail') {
      if (!id) return res.status(400).json({ status: false, error: 'Parameter id wajib diisi!' });
      const data = await getDramaDetail(platform, id);
      return res.status(200).json(data);
    }
    if (action === 'episodes') {
      if (!id) return res.status(400).json({ status: false, error: 'Parameter id wajib diisi!' });
      const data = await getEpisodes(platform, id);
      return res.status(200).json(data);
    }
    if (action === 'stream') {
      if (!id) return res.status(400).json({ status: false, error: 'Parameter id wajib diisi!' });
      const data = await getStream(platform, id, episode || 1);
      return res.status(200).json(data);
    }

    return res.status(400).json({ status: false, error: 'Action parameter tidak valid (feed, search, detail, episodes, stream)' });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
