const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://otakudesu.blog";
const CREATOR = "ReyCode";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Referer: BASE_URL,
};

const client = axios.create({
  headers: HEADERS,
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 400,
});

const formatResponse = (success, dataOrMessage) => {
  const result = { creator: CREATOR, status: success };
  if (success) {
    result.data = dataOrMessage;
  } else {
    result.message = dataOrMessage;
  }
  return result;
};

// ==========================================
// OTAKUDESU SCRAPER ENGINE CORE
// ==========================================

async function getHome() {
  try {
    const { data } = await client.get(BASE_URL);
    const $ = cheerio.load(data);

    const ongoing = [];
    $(".venz").first().find("ul li").each((_, el) => {
      const item = $(el);
      const title = item.find("h2").text().trim();
      const url = item.find("a").first().attr("href");
      const thumb = item.find("img").attr("src");
      const episode = item.find(".epz").text().trim();
      const day = item.find(".epztipe").text().trim();
      const date = item.find(".newseps").text().trim();
      const endpoint = url ? url.replace(`${BASE_URL}/anime/`, "").replace(/\/$/, "") : "";

      if (title && url) {
        ongoing.push({ id: endpoint, title, endpoint, url, cover: thumb, thumb, totalEpisodes: episode, episode, day, date, platform: 'otakudesu' });
      }
    });

    const completed = [];
    $(".venz").last().find("ul li").each((_, el) => {
      const item = $(el);
      const title = item.find("h2").text().trim();
      const url = item.find("a").first().attr("href");
      const thumb = item.find("img").attr("src");
      const episode = item.find(".epz").text().trim();
      const score = item.find(".epztipe").text().trim();
      const date = item.find(".newseps").text().trim();
      const endpoint = url ? url.replace(`${BASE_URL}/anime/`, "").replace(/\/$/, "") : "";

      if (title && url) {
        completed.push({ id: endpoint, title, endpoint, url, cover: thumb, thumb, totalEpisodes: episode, episode, score, date, platform: 'otakudesu' });
      }
    });

    return formatResponse(true, { ongoing, completed });
  } catch (err) {
    return formatResponse(false, err.message);
  }
}

async function getOngoingAnime(page = 1) {
  try {
    const url = page > 1 ? `${BASE_URL}/ongoing-anime/page/${page}/` : `${BASE_URL}/ongoing-anime/`;
    const { data } = await client.get(url);
    const $ = cheerio.load(data);
    const anime = [];

    $(".venz ul li").each((_, el) => {
      const item = $(el);
      const title = item.find("h2").text().trim();
      const url = item.find("a").first().attr("href");
      const thumb = item.find("img").attr("src");
      const episode = item.find(".epz").text().trim();
      const day = item.find(".epztipe").text().trim();
      const date = item.find(".newseps").text().trim();
      const endpoint = url ? url.replace(`${BASE_URL}/anime/`, "").replace(/\/$/, "") : "";

      if (title && url) {
        anime.push({ id: endpoint, title, endpoint, url, cover: thumb, thumb, totalEpisodes: episode, episode, day, date, platform: 'otakudesu' });
      }
    });

    return formatResponse(true, { page: Number(page), anime });
  } catch (err) {
    return formatResponse(false, err.message);
  }
}

async function getCompleteAnime(page = 1) {
  try {
    const url = page > 1 ? `${BASE_URL}/complete-anime/page/${page}/` : `${BASE_URL}/complete-anime/`;
    const { data } = await client.get(url);
    const $ = cheerio.load(data);
    const anime = [];

    $(".venz ul li").each((_, el) => {
      const item = $(el);
      const title = item.find("h2").text().trim();
      const url = item.find("a").first().attr("href");
      const thumb = item.find("img").attr("src");
      const episode = item.find(".epz").text().trim();
      const score = item.find(".epztipe").text().trim();
      const date = item.find(".newseps").text().trim();
      const endpoint = url ? url.replace(`${BASE_URL}/anime/`, "").replace(/\/$/, "") : "";

      if (title && url) {
        anime.push({ id: endpoint, title, endpoint, url, cover: thumb, thumb, totalEpisodes: episode, episode, score, date, platform: 'otakudesu' });
      }
    });

    return formatResponse(true, { page: Number(page), anime });
  } catch (err) {
    return formatResponse(false, err.message);
  }
}

async function searchAnime(query) {
  try {
    const { data } = await client.get(`${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=anime`);
    const $ = cheerio.load(data);
    const results = [];

    $(".chivsrc li").each((_, el) => {
      const item = $(el);
      const title = item.find("h2 a").text().trim();
      const url = item.find("h2 a").attr("href");
      const thumb = item.find("img").attr("src");
      const endpoint = url ? url.replace(`${BASE_URL}/anime/`, "").replace(/\/$/, "") : "";

      const genres = [];
      item.find(".set a").each((_, g) => genres.push($(g).text().trim()));
      const status = item.find(".set:contains('Status')").text().replace("Status :", "").trim();
      const rating = item.find(".set:contains('Rating')").text().replace("Rating :", "").trim();

      if (title && url) {
        results.push({ id: endpoint, title, endpoint, url, cover: thumb, thumb, genres, status, rating, platform: 'otakudesu' });
      }
    });

    return formatResponse(true, results);
  } catch (err) {
    return formatResponse(false, err.message);
  }
}

async function getAnimeDetail(endpoint) {
  try {
    const cleanEndpoint = endpoint.trim().replace(/^\/|\/$/g, "");
    const fullUrl = cleanEndpoint.startsWith("http") ? cleanEndpoint : `${BASE_URL}/anime/${cleanEndpoint}/`;

    const res = await client.get(fullUrl);
    const finalUrl = res.request?.res?.responseUrl || fullUrl;
    const $ = cheerio.load(res.data);

    const info = {};
    $(".infozingle p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes(":")) {
        const [k, ...v] = text.split(":");
        info[k.trim()] = v.join(":").trim();
      }
    });

    const episodes = [];
    $(".episodelist").each((_, epDiv) => {
      $(epDiv).find("ul li").each((_, el) => {
        const a = $(el).find("a");
        const date = $(el).find(".zeebr").text().trim();
        const epUrl = a.attr("href");
        const epTitle = a.text().trim();
        if (epUrl && epTitle && epUrl.includes("/episode/")) {
          const epEndpoint = epUrl.replace(`${BASE_URL}/episode/`, "").replace(/\/$/, "");
          episodes.push({
            index: episodes.length + 1,
            chapterId: epEndpoint,
            chapterName: epTitle,
            slug: epEndpoint,
            title: epTitle,
            endpoint: epEndpoint,
            url: epUrl,
            date,
          });
        }
      });
    });

    const thumb = $(".attachment-post-thumbnail").attr("src");
    return formatResponse(true, {
      id: cleanEndpoint,
      platform: 'otakudesu',
      title: info["Judul"] || $(".jdlwrap h1").text().trim() || $("h1.entry-title").text().trim(),
      japanese: info["Japanese"] || null,
      score: info["Skor"] || null,
      status: info["Status"] || null,
      totalEpisodes: info["Total Episode"] || episodes.length,
      genres: info["Genre"] ? info["Genre"].split(",").map((g) => g.trim()) : [],
      synopsis: $(".sinopc").text().trim(),
      cover: thumb,
      thumb: thumb,
      episodes,
    });
  } catch (err) {
    return formatResponse(false, err.message);
  }
}

async function getEpisodeDetail(endpoint, episodeNumber = null) {
  try {
    let cleanEndpoint = endpoint.trim().replace(/^\/|\/$/g, "");
    let targetUrl = cleanEndpoint.startsWith("http") ? cleanEndpoint : `${BASE_URL}/episode/${cleanEndpoint}/`;

    let res = await client.get(targetUrl);
    let finalUrl = res.request?.res?.responseUrl || targetUrl;
    let $ = cheerio.load(res.data);

    let directPlayUrl = $(".responsive-embed-stream iframe").attr("src") || null;

    return formatResponse(true, {
      title: $(".posttl").text().trim() || $("h1").text().trim() || "Streaming Episode",
      directPlayUrl: directPlayUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      streamUrl: directPlayUrl,
    });
  } catch (err) {
    return formatResponse(false, err.message);
  }
}

async function getSchedule() {
  try {
    const { data } = await client.get(`${BASE_URL}/jadwal-rilis/`);
    const $ = cheerio.load(data);
    const schedule = [];

    $(".kglist321").each((_, el) => {
      const day = $(el).find("h2").text().trim();
      const anime = [];
      $(el).find("ul li a").each((_, a) => {
        const title = $(a).text().trim();
        const url = $(a).attr("href");
        const endpoint = url ? url.replace(`${BASE_URL}/anime/`, "").replace(/\/$/, "") : "";
        if (title && url) anime.push({ id: endpoint, title, endpoint, url, platform: 'otakudesu' });
      });
      if (day) schedule.push({ day, anime });
    });

    return formatResponse(true, schedule);
  } catch (err) {
    return formatResponse(false, err.message);
  }
}

// ==========================================
// SERVERLESS HANDLER UTAMA (/api/anime)
// ==========================================
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const query = req.method === "GET" ? req.query : (req.body || {});
    const action = query.action || "home";
    const searchQuery = query.query || query.q || "";
    const contentId = query.id || query.endpoint || "";
    const episodeIdx = query.episode || 1;
    const pageNum = parseInt(query.page) || 1;

    if (action === 'home' || action === 'feed' || (!query.action && !query.id && !query.q)) {
      const homeRes = await getHome();
      return res.status(200).json({ status: true, creator: CREATOR, dramas: homeRes.data?.ongoing || [] });
    }

    if (action === 'ongoing') {
      const ongoingRes = await getOngoingAnime(pageNum);
      return res.status(200).json({ status: true, creator: CREATOR, dramas: ongoingRes.data?.anime || [] });
    }

    if (action === 'complete') {
      const compRes = await getCompleteAnime(pageNum);
      return res.status(200).json({ status: true, creator: CREATOR, dramas: compRes.data?.anime || [] });
    }

    if (action === 'search') {
      const searchRes = await searchAnime(searchQuery);
      return res.status(200).json({ status: true, creator: CREATOR, results: searchRes.data || [] });
    }

    if (action === 'detail') {
      const detailRes = await getAnimeDetail(contentId);
      return res.status(200).json(detailRes.status ? detailRes.data : { status: false, error: detailRes.message });
    }

    if (action === 'episodes') {
      const detailRes = await getAnimeDetail(contentId);
      return res.status(200).json({ status: true, creator: CREATOR, episodes: detailRes.data?.episodes || [] });
    }

    if (action === 'stream') {
      const streamRes = await getEpisodeDetail(contentId, episodeIdx);
      return res.status(200).json({ status: streamRes.status, creator: CREATOR, ...streamRes.data });
    }

    if (action === 'schedule') {
      const schRes = await getSchedule();
      return res.status(200).json({ status: true, creator: CREATOR, data: schRes.data || [] });
    }

    return res.status(400).json({ status: false, creator: CREATOR, error: `Aksi '${action}' tidak dikenal.` });

  } catch (err) {
    return res.status(500).json({ 
      status: false, 
      creator: CREATOR, 
      error: err.message || "Internal Server Error" 
    });
  }
};
