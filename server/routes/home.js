import express from 'express';
import Banner from '../models/Banner.js';
import HomeSection from '../models/HomeSection.js';
import Anime from '../models/Anime.js';
import WatchHistory from '../models/WatchHistory.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  const banners = await Banner.find({ active: true }).sort({ order: 1 }).populate('animeId').lean();
  const sections = await HomeSection.find({ active: true }).sort({ order: 1 }).lean();

  const sectionPayload = [];
  for (const s of sections) {
    let animes = [];
    if (s.type === 'custom' && s.animeIds?.length) {
      animes = await Anime.find({ _id: { $in: s.animeIds } }).lean();
    } else if (s.type === 'trending') {
      animes = await Anime.find({}).sort({ trendingScore: -1 }).limit(12).lean();
    } else if (s.type === 'top_rated') {
      animes = await Anime.find({}).sort({ rating: -1 }).limit(12).lean();
    } else if (s.type === 'recent') {
      animes = await Anime.find({}).sort({ createdAt: -1 }).limit(12).lean();
    } else if (s.type === 'genre' && s.genre) {
      animes = await Anime.find({ genres: s.genre }).sort({ rating: -1 }).limit(12).lean();
    }
    sectionPayload.push({ ...s, animes });
  }

  let continueWatching = [];
  if (req.userId) {
    continueWatching = await WatchHistory.find({ userId: req.userId, completed: false })
      .sort({ lastWatchedAt: -1 })
      .limit(10)
      .populate('animeId')
      .populate('episodeId')
      .lean();
  }

  const trending = await Anime.find({}).sort({ trendingScore: -1 }).limit(12).lean();
  const topRated = await Anime.find({}).sort({ rating: -1 }).limit(12).lean();
  const recent = await Anime.find({}).sort({ createdAt: -1 }).limit(12).lean();

  const genreAgg = await Anime.aggregate([
    { $unwind: '$genres' },
    { $group: { _id: '$genres', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 12 },
  ]);

  res.json({
    banners,
    sections: sectionPayload,
    continueWatching,
    trending,
    topRated,
    recent,
    popularGenres: genreAgg.map((g) => ({ name: g._id, count: g.count })),
  });
});

export default router;
