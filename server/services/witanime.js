/**
 * Witanime Scraper Service
 * Provides search, anime info (with episode list), and episode stream extraction
 * for the Arabic anime streaming site Witanime (witanime.you)
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const BASE = 'https://witanime.you';
const WTSRV = 'https://wtsrv.xyz';
const WORKUPLOAD = 'https://workupload.com';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar,en;q=0.5',
};

// ---------- Helpers ----------

function parseCookies(headers) {
  const cookieHeaders = headers?.['set-cookie'] || [];
  return cookieHeaders.map((c) => c.split(';')[0]).join('; ');
}

function mergeCookies(existing, incoming) {
  if (!incoming) return existing;
  const map = {};
  for (const part of existing.split('; ').filter(Boolean)) {
    const [k, v] = part.split('=');
    if (k) map[k.trim()] = v || '';
  }
  for (const part of incoming.split('; ').filter(Boolean)) {
    const [k, v] = part.split('=');
    if (k) map[k.trim()] = v || '';
  }
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Decode the XOR-encrypted episode list embedded in anime page HTML.
 * Witanime stores episodes as:  processedEpisodeData = 'encodedData.keyBase64'
 * where encodedData is base64(XOR(json, key)) and keyBase64 is base64(key).
 */
function decryptEpisodes(html) {
  const match = html.match(/processedEpisodeData\s*=\s*'([^']+)'/s);
  if (!match) return [];
  const full = match[1];
  const dotIdx = full.lastIndexOf('.');
  if (dotIdx === -1) return [];
  const encoded = full.substring(0, dotIdx);
  const keyB64 = full.substring(dotIdx + 1);
  const key = Buffer.from(keyB64, 'base64').toString('utf8');
  const data = Buffer.from(encoded, 'base64');
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data[i] ^ key.charCodeAt(i % key.length));
  }
  try {
    return JSON.parse(result);
  } catch {
    return [];
  }
}

/**
 * Decode the XOR-encrypted server URLs embedded in episode page HTML.
 * Variables _m (key), _p0/_p1 (URL parts hex), _s (ordering), _a (server ids)
 */
function decryptServerUrls(html) {
  const mMatch = html.match(/var\s+_m\s*=\s*\{[^}]*"r"\s*:\s*"([^"]+)"/);
  const p0Match = html.match(/var\s+_p0\s*=\s*(\[[^\]]+\])/);
  const p1Match = html.match(/var\s+_p1\s*=\s*(\[[^\]]+\])/);
  const sMatch = html.match(/var\s+_s\s*=\s*(\[[^\]]+\])/);

  if (!mMatch || !p0Match || !sMatch) return [];

  const keyHex = Buffer.from(mMatch[1], 'base64').toString('utf8');

  function xorHex(hexStr, keyStr) {
    const bytes = Buffer.from(hexStr, 'hex');
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(bytes[i] ^ keyStr.charCodeAt(i % keyStr.length));
    }
    return result;
  }

  const p0Raw = JSON.parse(p0Match[1]);
  const p1Raw = p1Match ? JSON.parse(p1Match[1]) : [];
  const sRaw = JSON.parse(sMatch[1]);

  const p0d = p0Raw.map((h) => xorHex(h, keyHex));
  const p1d = p1Raw.map((h) => xorHex(h, keyHex));
  const s0 = JSON.parse(xorHex(sRaw[0], keyHex));
  const s1 = sRaw[1] ? JSON.parse(xorHex(sRaw[1], keyHex)) : null;

  // px9.js algorithm: arranged[seq[j]] = decrypted[j]
  function assembleUrl(parts, seq) {
    const arranged = new Array(seq.length);
    for (let j = 0; j < seq.length; j++) {
      arranged[seq[j]] = parts[j];
    }
    return arranged.join('');
  }

  const urls = [];
  if (s0 && p0d.length) {
    const url = assembleUrl(p0d, s0);
    if (url.startsWith('http')) urls.push(url);
  }
  if (s1 && p1d.length) {
    const url = assembleUrl(p1d, s1);
    if (url.startsWith('http')) urls.push(url);
  }
  return urls;
}

// ---------- Wtsrv → direct URL ----------

async function resolveWtsrvUrl(wtsrvUrl) {
  // 1. Extract short code (support alpha-numeric, dash, and underscores)
  const codeMatch = wtsrvUrl.match(/wtsrv\.xyz\/([A-Za-z0-9_-]+)/);
  if (!codeMatch) throw new Error('Invalid wtsrv URL');
  const code = codeMatch[1];

  // 2. Visit timer page to get session cookie
  const timerRes = await axios.get(`${WTSRV}/timer.php?c=${code}`, {
    headers: { ...DEFAULT_HEADERS, Referer: BASE },
    maxRedirects: 5,
    validateStatus: (s) => true,
  });
  let cookies = parseCookies(timerRes.headers);

  // 3. Call API (after simulated 5s wait the server allows it)
  await new Promise((r) => setTimeout(r, 5500));
  const apiRes = await axios.get(`${WTSRV}/api.php?redirect=${encodeURIComponent(code)}`, {
    headers: {
      ...DEFAULT_HEADERS,
      Referer: `${WTSRV}/timer.php?c=${code}`,
      Cookie: cookies,
      'X-Requested-With': 'XMLHttpRequest',
    },
    maxRedirects: 0,
    validateStatus: (s) => true,
  });

  const location = apiRes.headers.location;
  if (!location) throw new Error('No redirect from wtsrv API');
  return location; // e.g. https://workupload.com/file/XXXXXXXX
}

// ---------- Workupload SHA-256 puzzle solver ----------

async function sha256Hex(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

async function resolveWorkuploadUrl(fileUrl) {
  const fileId = fileUrl.split('/').pop();

  // 1. Get session cookie from file page
  const pageRes = await axios.get(fileUrl, {
    headers: { ...DEFAULT_HEADERS },
    maxRedirects: 5,
    validateStatus: (s) => true,
  });
  let cookies = parseCookies(pageRes.headers);

  // 2. Fetch puzzle
  const puzzleRes = await axios.get(`${WORKUPLOAD}/puzzle`, {
    headers: { ...DEFAULT_HEADERS, Referer: fileUrl, Cookie: cookies },
    validateStatus: (s) => true,
  });
  cookies = mergeCookies(cookies, parseCookies(puzzleRes.headers));

  const { puzzle, find, range } = puzzleRes.data?.data || {};
  if (!puzzle || !find?.length) throw new Error('Could not fetch workupload puzzle');

  // 3. Solve SHA-256 proof-of-work
  const solutions = [];
  for (let i = 0; i < range && solutions.length < find.length; i++) {
    const hash = await sha256Hex(puzzle + i);
    if (find.includes(hash)) solutions.push(i);
  }
  if (solutions.length < find.length) throw new Error('Could not solve workupload puzzle');

  // 4. Submit captcha
  const captchaBody = `captcha=${encodeURIComponent(solutions.join(' ') + ' ')}`;
  const captchaRes = await axios.post(`${WORKUPLOAD}/captcha`, captchaBody, {
    headers: {
      ...DEFAULT_HEADERS,
      Referer: fileUrl,
      Cookie: cookies,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    validateStatus: (s) => true,
  });
  cookies = mergeCookies(cookies, parseCookies(captchaRes.headers));

  // 5. Verify it's a video file page (not a zip archive)
  const authPageRes = await axios.get(fileUrl, {
    headers: { ...DEFAULT_HEADERS, Cookie: cookies },
    validateStatus: (s) => true,
  });
  const $ = cheerio.load(authPageRes.data);
  const pageTitle = $('title').text().trim().toLowerCase();
  const isVideo =
    pageTitle.includes('.mp4') ||
    pageTitle.includes('.mkv') ||
    pageTitle.includes('.avi') ||
    pageTitle.includes('.webm');

  if (!isVideo) {
    throw new Error('Workupload file is not a playable video (e.g. it is a zip archive)');
  }

  // 6. Get download server URL
  const dlRes = await axios.get(`${WORKUPLOAD}/api/file/getDownloadServer/${fileId}`, {
    headers: { ...DEFAULT_HEADERS, Referer: fileUrl, Cookie: cookies },
    validateStatus: (s) => true,
  });

  const dlUrl = dlRes.data?.data?.url;
  if (!dlUrl) throw new Error('No download URL from workupload');
  return { url: dlUrl, type: 'mp4' };
}

// ---------- Mediafire link extractor ----------

async function resolveMediafireUrl(fileUrl) {
  const res = await axios.get(fileUrl, {
    headers: DEFAULT_HEADERS,
  });
  const $ = cheerio.load(res.data);
  const dlLink = $('a#downloadButton').attr('href') || $('[aria-label="Download file"]').attr('href');
  if (!dlLink) {
    throw new Error('No download link found on Mediafire page');
  }

  const title = $('title').text().trim().toLowerCase();
  const isVideo =
    title.includes('.mp4') ||
    title.includes('.mkv') ||
    title.includes('.avi') ||
    dlLink.toLowerCase().includes('.mp4') ||
    dlLink.toLowerCase().includes('.mkv');

  if (!isVideo) {
    throw new Error('Mediafire file is not a playable video (e.g. it is a zip archive)');
  }

  return { url: dlLink, type: 'mp4' };
}

// ---------- Public API ----------

/**
 * Search Witanime for anime by query string.
 * Returns array of { id, title, image }
 */
export async function witanimeSearch(query) {
  const res = await axios.get(`${BASE}/?search_param=animes&s=${encodeURIComponent(query)}`, {
    headers: DEFAULT_HEADERS,
  });
  const $ = cheerio.load(res.data);
  const results = [];
  $('.anime-card-container').each((i, el) => {
    const a = $(el).find('.anime-card-title a');
    const title = a.text().trim();
    const url = a.attr('href');
    const image = $(el).find('img').attr('src') || '';
    if (title && url) results.push({ id: url, title, image });
  });
  return results;
}

/**
 * Fetch full anime info including episode list.
 * animeId is the full URL: https://witanime.you/anime/...
 */
export async function witanimeAnimeInfo(animeId) {
  const res = await axios.get(animeId, { headers: DEFAULT_HEADERS });
  const $ = cheerio.load(res.data);

  const title = $('h1').first().text().trim();
  const image =
    $('.anime-thumbnail img').attr('src') || $('.anime-poster img').attr('src') || '';
  const description = $('.anime-story').text().trim();
  const genres = [];
  $('.anime-genres a, .anime-genre a').each((i, el) => genres.push($(el).text().trim()));
  const status = $('.anime-status').text().trim();

  const rawEpisodes = decryptEpisodes(res.data);
  const episodes = rawEpisodes.map((ep) => ({
    id: ep.url,
    number: parseInt(ep.number, 10) || 0,
    title: `الحلقة ${ep.number}`,
    url: ep.url,
    screenshot: ep.screenshot || '',
  }));

  return {
    id: animeId,
    title,
    image,
    description,
    genres,
    status,
    totalEpisodes: episodes.length,
    episodes,
  };
}

/**
 * Fetch playable stream URL for a given episode.
 * episodeId is the full episode URL: https://witanime.you/episode/...
 * Returns { url, type: 'mp4', subtitles: [] }
 */
export async function witanimeEpisodeStream(episodeId) {
  const res = await axios.get(episodeId, {
    headers: { ...DEFAULT_HEADERS, Referer: BASE },
  });

  const wtsrvUrls = decryptServerUrls(res.data);
  if (!wtsrvUrls.length) {
    throw new Error('No stream servers found for this episode.');
  }

  let lastError;
  for (const wtsrvUrl of wtsrvUrls) {
    try {
      let targetUrl = wtsrvUrl;
      if (wtsrvUrl.includes('wtsrv.xyz')) {
        targetUrl = await resolveWtsrvUrl(wtsrvUrl);
      }

      if (targetUrl.includes('workupload.com')) {
        const stream = await resolveWorkuploadUrl(targetUrl);
        return { ...stream, subtitles: [] };
      } else if (targetUrl.includes('mediafire.com')) {
        const stream = await resolveMediafireUrl(targetUrl);
        return { ...stream, subtitles: [] };
      }

      // If it's a direct url or unknown provider, return it if it's likely a video
      const isLikelyVideo =
        /\.(mp4|mkv|m3u8|webm)/i.test(targetUrl) ||
        !/(zip|rar|tar|7z|pdf|txt|docx)/i.test(targetUrl);

      if (!isLikelyVideo) {
        throw new Error(`Resolved URL is not a playable video file: ${targetUrl}`);
      }

      return { url: targetUrl, type: 'mp4', subtitles: [] };
    } catch (e) {
      lastError = e;
      console.warn(`[witanime] Server ${wtsrvUrl} failed: ${e.message}`);
    }
  }

  throw new Error(lastError?.message || 'All stream servers failed for this episode.');
}
