import express from 'express';
import mongoose from 'mongoose';
import Episode from '../models/Episode.js';
import Anime from '../models/Anime.js';
import WatchHistory from '../models/WatchHistory.js';
import { requireAuth } from '../middleware/auth.js';
import { consumetEpisodeStream } from '../services/consumet.js';
import { signStreamAccess, refererForProvider } from '../utils/streamToken.js';

const router = express.Router();

router.get('/anime/:animeId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.animeId)) {
      return res.status(400).json({ message: 'Invalid anime id' });
    }
    const eps = await Episode.find({ animeId: req.params.animeId })
      .sort({ season: 1, number: 1 })
      .select('-streamUrl')
      .lean();
    res.json({ data: eps });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/:episodeId', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.episodeId)) {
      return res.status(400).json({ message: 'Invalid episode id' });
    }
    const ep = await Episode.findById(req.params.episodeId).lean();
    if (!ep) return res.status(404).json({ message: 'Episode not found' });
    const anime = await Anime.findById(ep.animeId).select('title coverImage').lean();
    const { streamUrl: _omit, ...episodeSafe } = ep;
    res.json({
      episode: episodeSafe,
      anime,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

function buildProxiedPlaybackUrl(rawUrl, episodeId, type, referer = '') {
  const token = signStreamAccess(episodeId, referer);
  const enc = encodeURIComponent(token);
  const encUrl = encodeURIComponent(rawUrl);
  const isHls = type === 'hls' || /\.m3u8/i.test(rawUrl);
  if (isHls) {
    return `/api/proxy/hls?token=${enc}&url=${encUrl}`;
  }
  return `/api/proxy/segment?token=${enc}&url=${encUrl}`;
}

function detectSourceType(url) {
  if (!url) return 'embed';
  const cleanUrl = url.trim().toLowerCase();
  if (cleanUrl.includes('.m3u8') || cleanUrl.includes('application/x-mpegurl')) {
    return 'm3u8';
  }
  if (cleanUrl.includes('.mp4') || cleanUrl.includes('.webm') || cleanUrl.includes('.ogg')) {
    return 'mp4';
  }
  if (
    cleanUrl.includes('embed') ||
    cleanUrl.includes('iframe') ||
    cleanUrl.includes('player') ||
    cleanUrl.includes('videa.hu') ||
    cleanUrl.includes('youtube.com/embed') ||
    cleanUrl.includes('dailymotion.com/embed')
  ) {
    return 'embed';
  }
  return 'embed'; // Fallback for graduation demo
}

router.get('/:episodeId/stream', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.episodeId)) {
      return res.status(400).json({ message: 'Invalid episode id' });
    }
    const ep = await Episode.findById(req.params.episodeId).lean();
    if (!ep) return res.status(404).json({ message: 'Episode not found' });

    let rawUrl;
    let type;
    let subtitles = ep.subtitles || [];
    let source = ep.streamSource || 'url';

    if (ep.streamSource === 'consumet') {
      if (!ep.consumetProvider || !ep.consumetEpisodeId) {
        return res.status(400).json({
          message:
            'Episode missing streaming link. Re-import with Witanime (Arabic - Recommended), AnimeSaturn, or AnimeUnity in Admin → Episodes.',
        });
      }
      const live = await consumetEpisodeStream(ep.consumetProvider, ep.consumetEpisodeId);
      rawUrl = live.url;
      type = live.type; // 'hls', 'mp4', or 'embed'
      subtitles = live.subtitles?.length ? live.subtitles : subtitles;
      source = 'consumet';
    } else {
      if (!ep.streamUrl?.trim()) {
        return res.status(400).json({ message: 'No stream URL configured for this episode' });
      }
      rawUrl = ep.streamUrl;
      const configuredType = ep.sourceType || 'auto';
      if (configuredType === 'auto') {
        type = detectSourceType(rawUrl);
      } else {
        type = configuredType === 'm3u8' ? 'hls' : configuredType;
      }
    }

    const isIframeOrEmbed = type === 'embed' || type === 'iframe' || type === 'external';

    let playbackUrl = rawUrl;
    let proxied = false;

    // Only apply segment/HLS proxy to native playable streams
    if (!isIframeOrEmbed) {
      const resolvedType = type === 'mp4' && !/\.m3u8/i.test(rawUrl) ? 'mp4' : 'hls';
      type = resolvedType;
      const referer =
        ep.streamSource === 'consumet' ? refererForProvider(ep.consumetProvider) : '';
      playbackUrl = buildProxiedPlaybackUrl(rawUrl, ep._id.toString(), resolvedType, referer);
      proxied = true;
    }

    res.json({
      url: playbackUrl,
      type, // 'hls', 'mp4', 'embed', 'iframe', 'external'
      subtitles,
      durationSeconds: ep.durationSeconds,
      source,
      proxied,
    });
  } catch (e) {
    console.error('Stream error:', e.message);
    res.status(502).json({ message: e.message || 'Failed to load stream' });
  }
});

router.post('/:episodeId/progress', requireAuth, async (req, res) => {
  try {
    const { progressSeconds = 0, completed = false } = req.body;
    const ep = await Episode.findById(req.params.episodeId);
    if (!ep) return res.status(404).json({ message: 'Episode not found' });

    await WatchHistory.findOneAndUpdate(
      { userId: req.userId, episodeId: ep._id },
      {
        userId: req.userId,
        animeId: ep.animeId,
        episodeId: ep._id,
        progressSeconds,
        completed: !!completed,
        lastWatchedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
