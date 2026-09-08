/**
 * API Route: /api/anime
 * Enhanced NontonAnimeID Scraper Endpoint with Advanced Direct Stream Extractor for ReyCloud
 */

import https from 'https';
import http from 'http';

const BASE_URL = 'https://s13.nontonanimeid.boats';
const CREATOR = 'ReyCloudSHP';
const PROXY_WORKER_URL = 'https://anime-proxy.reyclouddev.workers.dev/?url=';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': BASE_URL + '/'
};

export function fetchHtml(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    let finalUrl = url.startsWith('//') ? 'https:' + url : url;
    const proxiedUrl = PROXY_WORKER_URL + encodeURIComponent(finalUrl);
    const client = proxiedUrl.startsWith('https:') ? https : http;

    const req = client.get(proxiedUrl, { headers: { ...HEADERS, ...customHeaders }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) redirectUrl = new URL(redirectUrl, finalUrl).href;
        return resolve(fetchHtml(redirectUrl, customHeaders));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${finalUrl}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(cleanEntities(data)));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${finalUrl}`)); });
    req.on('error', reject);
  });
}

function cleanEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#8211;|&#8212;/g, '–').replace(/&#8220;|&#8221;/g, '"').replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8230;/g, '…').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

export function cleanText(text) {
  if (!text) return '';
  return cleanEntities(text).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function wrapRes(data, message = 'Success', query = null) {
  const res = { status: 'success', creator: CREATOR, timestamp: new Date().toISOString(), message, data };
  if (query) res.query = query;
  return res;
}

export function parseScore(text) {
  if (!text) return null;
  const containerMatch = text.match(/<[^>]+class="[^"]*(?:skor-angka|as-rating|kotakscore|rating-text|value|rating)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/i);
  if (containerMatch) {
    const innerText = cleanText(containerMatch[1]);
    const numMatch = innerText.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      if (!isNaN(num) && num <= 10) return num;
    }
  }
  const match = text.match(/⭐\s*([0-9]+(?:\.[0-9]+)?)/) || text.match(/\(([0-9]+(?:\.[0-9]+)?)\)/) || text.match(/([0-9]+\.[0-9]{1,2})/);
  if (!match) return null;
  const num = parseFloat(match[1] || match[0]);
  return isNaN(num) || num > 10 ? null : num;
}

function unpackJs(packed) {
  const match = packed.match(/}\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split\('\|'\)/s);
  if (!match) return packed;
  const [_, payload, aStr, cStr, symtabStr] = match;
  const a = parseInt(aStr, 10);
  const c = parseInt(cStr, 10);
  const k = symtabStr.split('|');
  const e = function(c) {
    return (c < a ? '' : e(parseInt(c / a, 10))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
  };
  const d = {};
  for (let i = 0; i < c; i++) { d[e(i)] = k[i] || e(i); }
  return payload.replace(/\b\w+\b/g, (w) => (d[w] !== undefined ? d[w] : w));
}

function decodeXor(html) {
  const m = html.match(/var k="([^"]+)",b=atob\("([^"]+)"\)/);
  if (!m) return null;
  const k = m[1];
  const b = Buffer.from(m[2], 'base64').toString('binary');
  let o = '';
  for (let i = 0; i < b.length; i++) {
    o += String.fromCharCode(b.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  }
  return o;
}

// Ekstraktor Direct Stream Diperkuat
export async function extractStream(embedUrl) {
  try {
    let finalEmbedUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
    const html = await fetchHtml(finalEmbedUrl, { Referer: BASE_URL });

    // 1. Cari langsung link file direct atau go/dl
    const directDl = html.match(/(https?:\/\/[^\s"']+\/go\/dl\/\?url=[A-Za-z0-9+/=]+)/);
    if (directDl) return directDl[1];

    // 2. Cari file .mp4 atau .m3u8 langsung di dalam source code
    const directFile = html.match(/["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
    if (directFile) return directFile[1];

    // 3. Dekode Packer JavaScript Evaluasi
    const packers = [...html.matchAll(/eval\(function\(p,a,c,k,e,d\)[\s\S]+?\.split\('\|'\)\)\)/gi)];
    for (const p of packers) {
      const decoded = unpackJs(p[0]);
      const fileMatch = decoded.match(/https?:\/\/[^\s"',\\]+\.(?:mp4|m3u8)(\?[^\s"'\\]*)?/i) ||
                        decoded.match(/https?:\/\/[^\s"',\\]+\/go\/dl\/\?url=[A-Za-z0-9+/=]+/i) ||
                        decoded.match(/["']?file["']?\s*:\s*["']([^"']+)["']/i);
      if (fileMatch) {
        return (fileMatch[1] || fileMatch[0]).replace(/\\\//g, '/').replace(/\\'/g, "'");
      }
    }

    // 4. Dekode XOR terenkripsi
    const xorDecoded = decodeXor(html);
    if (xorDecoded) {
      const hlsMatch = xorDecoded.match(/HLS\s*=\s*["']([^"']+)["']/i) || xorDecoded.match(/file\s*:\s*["']([^"']+)["']/i);
      if (hlsMatch) {
        const path = hlsMatch[1].replace(/\\\//g, '/');
        if (path.startsWith('http')) return path;
        const origin = new URL(finalEmbedUrl).origin;
        return `${origin}/${path.replace(/^\//, '')}`;
      }
    }

    // 5. Cek Base64 Window Location / Srcdoc
    const srcdocAtob = html.match(/window\.location\.replace\(atob\(['"]([^'"]+)['"]\)\)/i);
    if (srcdocAtob) {
      const redirectUrl = Buffer.from(srcdocAtob[1], 'base64').toString('utf8');
      return extractStream(redirectUrl);
    }
  } catch {}
  return null;
}

export function parseAsAnimeCard(html) {
  const url = (html.match(/href="([^"]+)"/i) || [])[1] || null;
  const title = cleanText((html.match(/class="[^"]*as-anime-title[^"]*"[^>]*>([\s\S]*?)<\/h\d>/i) || html.match(/data-title-default="([^"]+)"/i) || html.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i) || html.match(/alt="([^"]+)"/i) || [])[1]);
  const img = (html.match(/<img[^>]*src="([^"]+)"/i) || html.match(/<img[^>]*data-src="([^"]+)"/i) || [])[1] || null;
  
  return {
    title,
    slug: url ? url.replace(/\/$/, '').split('/').pop() : null,
    url,
    thumbnail: img,
    score: parseScore(html)
  };
}

export async function getLatestEpisodes(page = 1) {
  const html = await fetchHtml(page > 1 ? `${BASE_URL}/page/${page}/` : BASE_URL);
  const results = [];
  for (const m of html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)) {
    const art = m[1];
    const href = (art.match(/<a\s+href="([^"]+)"/i) || [])[1];
    const title = cleanText((art.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i) || art.match(/data-title-default="([^"]+)"/i) || art.match(/alt="([^"]+)"/i) || [])[1]);
    const img = (art.match(/<img[^>]*src="([^"]+)"/i) || art.match(/<img[^>]*data-src="([^"]+)"/i) || [])[1] || null;
    const epMatch = art.match(/class="[^"]*types\s+episodes[^"]*"[^>]*>[\s\S]*?<\/span>\s*(\d+)/i) || art.match(/class="[^"]*types\s+episodes[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const rawEp = epMatch ? (epMatch[1] ? cleanText(epMatch[1]).replace(/[^\d]/g, '') : '') : null;
    const epCount = rawEp ? `Episode ${rawEp}` : null;

    if (href && title) {
      results.push({ title, episode_count: epCount, score: parseScore(art), slug: href.replace(/\/$/, '').split('/').pop(), url: href, thumbnail: img });
    }
  }
  return wrapRes(results, `Berhasil mengambil episode terbaru halaman ${page}`);
}

export async function searchAnime(query) {
  const html = await fetchHtml(`${BASE_URL}/?s=${encodeURIComponent(query)}`);
  const cards = [...html.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*class="[^"]*as-anime-card[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)];
  return wrapRes(cards.map(c => parseAsAnimeCard(c[0])), `Hasil pencarian untuk '${query}'`, query);
}

export async function getAnimeCatalog(page = 1) {
  const html = await fetchHtml(page > 1 ? `${BASE_URL}/anime/page/${page}/` : `${BASE_URL}/anime/`);
  const cards = [...html.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*class="[^"]*as-anime-card[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)];
  return wrapRes(cards.map(c => parseAsAnimeCard(c[0])), `Katalog halaman ${page}`);
}

export async function getAnimeDetails(animeSlug) {
  const finalUrl = `${BASE_URL}/anime/${animeSlug.replace(/^\//, '').replace(/\/$/, '')}/`;
  const html = await fetchHtml(finalUrl);

  const rawTitle = cleanText((html.match(/<h1[^>]*class="entry-title"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || 'Unknown');
  const cleanTitle = rawTitle.replace(/^Nonton\s*/i, '').replace(/\s*Sub Indo$/i, '').trim();
  const poster = (html.match(/<article[^>]*>[\s\S]*?<img[^>]*src="([^"]*\/uploads\/[^"]+)"/i) || html.match(/class="poster"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i) || [])[1] || null;
  const synopsis = cleanText((html.match(/class="synopsis-prose"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/class="entry-content"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]);

  const episodes = [];
  const epSection = html.match(/class="[^"]*(?:episode-list-items|episodelist|misha_posts_wrap)[^"]*"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/Daftar Episode([\s\S]*?)(?:<footer|<div class="footer")/i);
  const parseLinks = (src) => {
    for (const em of src.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const epHref = em[1];
      const epRaw = cleanText(em[2]);
      if (epRaw.startsWith('Pertama') || epRaw.startsWith('Terakhir') || epHref.includes('/anime/') || episodes.some(e => e.url === epHref)) continue;
      const numMatch = epHref.match(/-episode-(\d+)/) || epRaw.match(/Episode\s*(\d+)/i);
      episodes.push({
        episode: numMatch ? parseInt(numMatch[1], 10) : (episodes.length + 1),
        title: epRaw || `Episode ${episodes.length + 1}`,
        slug: epHref.replace(/\/$/, '').split('/').pop(),
        url: epHref
      });
    }
  };
  if (epSection) parseLinks(epSection[1]); else parseLinks(html);

  return wrapRes({
    title: cleanTitle,
    poster,
    synopsis,
    total_episodes: episodes.length,
    episodes: episodes.reverse()
  }, `Detail anime ${cleanTitle}`);
}

export async function getEpisodeStream(episodeSlug) {
  const finalUrl = `${BASE_URL}/${episodeSlug.replace(/^\//, '').replace(/\/$/, '')}/`;
  const html = await fetchHtml(finalUrl);
  const rawTitle = cleanText((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || 'Episode');

  const embedUrl = (html.match(/<div id="videoku"[^>]*>[\s\S]*?<iframe[^>]*(?:data-src|src)="([^"]+)"/i) || [])[1]?.replace(/&amp;/g, '&') || null;
  
  // Ekstraksi otomatis direct link stream video
  let directHls = embedUrl ? await extractStream(embedUrl) : null;
  if (!directHls) {
    const genericFile = html.match(/["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
    if (genericFile) directHls = genericFile[1];
  }

  const downloads = [];
  for (const dm of html.matchAll(/<div class="listlink"[^>]*>([\s\S]*?)<\/div>/gi)) {
    for (const am of dm[1].matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      downloads.push({ server: cleanText(am[2]), url: am[1] });
    }
  }

  return wrapRes({
    title: rawTitle,
    embed_url: embedUrl,
    direct_stream: directHls,
    download_links: downloads,
    original_page_url: finalUrl
  }, `Stream episode ${rawTitle}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: false, error: 'Method not allowed' });

  try {
    const { action, query, page, slug } = req.query || {};

    if (action === 'latest') {
      const data = await getLatestEpisodes(parseInt(page || '1', 10));
      return res.status(200).json(data);
    }
    if (action === 'search') {
      if (!query) return res.status(400).json({ status: false, error: 'Parameter query wajib diisi!' });
      const data = await searchAnime(query);
      return res.status(200).json(data);
    }
    if (action === 'catalog') {
      const data = await getAnimeCatalog(parseInt(page || '1', 10));
      return res.status(200).json(data);
    }
    if (action === 'detail') {
      if (!slug) return res.status(400).json({ status: false, error: 'Parameter slug anime wajib diisi!' });
      const data = await getAnimeDetails(slug);
      return res.status(200).json(data);
    }
    if (action === 'stream') {
      if (!slug) return res.status(400).json({ status: false, error: 'Parameter slug episode wajib diisi!' });
      const data = await getEpisodeStream(slug);
      return res.status(200).json(data);
    }

    return res.status(400).json({ status: false, error: 'Action parameter tidak valid (latest, search, catalog, detail, stream)' });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
