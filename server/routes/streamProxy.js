import express from 'express';
import axios from 'axios';
import { verifyStreamAccess } from '../utils/streamToken.js';

const router = express.Router();

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function resolveUrl(base, relative) {
  try {
    return new URL(relative.trim(), base).href;
  } catch {
    return relative;
  }
}

function proxyUrl(req, token, absolute) {
  const hostBase = `${req.protocol}://${req.get('host')}/api/proxy`;
  const tok = encodeURIComponent(token);
  const enc = encodeURIComponent(absolute);
  if (/\.m3u8/i.test(absolute)) {
    return `${hostBase}/hls?token=${tok}&url=${enc}`;
  }
  return `${hostBase}/segment?token=${tok}&url=${enc}`;
}

function rewritePlaylist(body, playlistUrl, token, req) {
  const base = playlistUrl.includes('/')
    ? playlistUrl.slice(0, playlistUrl.lastIndexOf('/') + 1)
    : `${playlistUrl}/`;

  return body
    .split('\n')
    .map((line) => {
      let out = line;

      // AES-128 keys and other tags with URI="..."
      if (line.includes('URI="')) {
        out = line.replace(/URI="([^"]+)"/g, (_, uri) => {
          const absolute = uri.startsWith('http') ? uri : resolveUrl(base, uri);
          return `URI="${proxyUrl(req, token, absolute)}"`;
        });
      }

      const trimmed = out.trim();
      if (!trimmed || trimmed.startsWith('#')) return out;

      const absolute = trimmed.startsWith('http') ? trimmed : resolveUrl(base, trimmed);
      return proxyUrl(req, token, absolute);
    })
    .join('\n');
}

function buildHeaders(target, referer) {
  const headers = {
    'User-Agent': UA,
    Accept: '*/*',
  };
  if (referer) {
    headers.Referer = referer;
    try {
      headers.Origin = new URL(referer).origin;
    } catch {
      /* ignore */
    }
  } else {
    try {
      const origin = new URL(target).origin;
      headers.Referer = `${origin}/`;
      headers.Origin = origin;
    } catch {
      /* ignore */
    }
  }
  return headers;
}

function extractTargetUrlAndCookie(target) {
  let targetUrl = target;
  let cookieHeader = null;
  if (targetUrl.includes('__cookie=')) {
    try {
      const urlObj = new URL(targetUrl);
      cookieHeader = urlObj.searchParams.get('__cookie');
      urlObj.searchParams.delete('__cookie');
      targetUrl = urlObj.toString();
    } catch {
      const match = targetUrl.match(/[?&]__cookie=([^&]+)/);
      if (match) {
        cookieHeader = decodeURIComponent(match[1]);
        targetUrl = targetUrl.replace(/[?&]__cookie=[^&]+/, '');
      }
    }
  }
  return { targetUrl, cookieHeader };
}

router.get('/hls', async (req, res) => {
  try {
    const { token, url: target } = req.query;
    const payload = verifyStreamAccess(token);

    if (!target || !target.startsWith('http')) {
      return res.status(400).send('Invalid stream URL');
    }

    const { targetUrl, cookieHeader } = extractTargetUrlAndCookie(target);
    const headers = buildHeaders(targetUrl, payload.referer);
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const { data } = await axios.get(targetUrl, {
      timeout: 25000,
      responseType: 'text',
      headers,
    });

    const rewritten = rewritePlaylist(data, targetUrl, token, req);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(rewritten);
  } catch (e) {
    console.error('HLS proxy error:', e.message);
    res.status(502).send('Failed to load stream');
  }
});

router.get('/segment', async (req, res) => {
  try {
    const { token, url: target } = req.query;
    const payload = verifyStreamAccess(token);

    if (!target || !target.startsWith('http')) {
      return res.status(400).send('Invalid segment URL');
    }

    const { targetUrl, cookieHeader } = extractTargetUrlAndCookie(target);
    const headers = buildHeaders(targetUrl, payload.referer);
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    const response = await axios.get(targetUrl, {
      timeout: 30000,
      responseType: 'stream',
      headers,
    });

    const interestingHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'content-disposition',
    ];
    for (const h of interestingHeaders) {
      if (response.headers[h]) {
        res.setHeader(h, response.headers[h]);
      }
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status);
    response.data.pipe(res);
  } catch (e) {
    console.error('Segment proxy error:', e.message);
    res.status(502).send('Failed to load segment');
  }
});

export default router;
