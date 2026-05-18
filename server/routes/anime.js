import express from 'express';
import mongoose from 'mongoose';
import Anime from '../models/Anime.js';
import Episode from '../models/Episode.js';
import Favorite from '../models/Favorite.js';
import { optionalAuth } from '../middleware/auth.js';
import { jikanSearchAnime, mapJikanAnimeToDoc } from '../services/jikan.js';
import { anilistSearch, mapAnilistMediaToPreview } from '../services/anilist.js';
import { buildSlug } from '../utils/slug.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.genre) {
      filter.genres = req.query.genre;
    }
    if (req.query.year) {
      filter.year = parseInt(req.query.year, 10);
    }

    let sort = { createdAt: -1 };
    if (req.query.sort === 'rating') sort = { rating: -1 };
    if (req.query.sort === 'popularity') sort = { popularity: -1 };
    if (req.query.sort === 'year') sort = { year: -1 };

    const [items, total] = await Promise.all([
      Anime.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Anime.countDocuments(filter),
    ]);

    res.json({
      data: items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 12);
    const items = await Anime.find({}).sort({ trendingScore: -1, rating: -1 }).limit(limit).lean();
    res.json({ data: items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const skip = (page - 1) * limit;

    const baseFilter = {};
    if (req.query.genre) {
      baseFilter.genres = req.query.genre;
    }
    if (req.query.year) {
      baseFilter.year = parseInt(req.query.year, 10);
    }

    let sort = { createdAt: -1 };
    if (!q) {
      if (req.query.popularity === 'high') sort = { popularity: -1 };
      else if (req.query.sort === 'rating') sort = { rating: -1 };
      else if (req.query.sort === 'year') sort = { year: -1 };
      else sort = { createdAt: -1 };
    } else {
      sort = { score: { $meta: 'textScore' } };
    }

    let items = [];
    let total = 0;

    if (q) {
      const textFilter = { ...baseFilter, $text: { $search: q } };
      try {
        const query = Anime.find(textFilter, { score: { $meta: 'textScore' } }).sort(sort);
        ;[items, total] = await Promise.all([query.skip(skip).limit(limit).lean(), Anime.countDocuments(textFilter)]);
      } catch {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const altFilter = { ...baseFilter, $or: [{ title: regex }, { description: regex }] };
        let altSort = { rating: -1 };
        if (req.query.popularity === 'high') altSort = { popularity: -1 };
        else if (req.query.sort === 'rating') altSort = { rating: -1 };
        else if (req.query.sort === 'year') altSort = { year: -1 };
        ;[items, total] = await Promise.all([
          Anime.find(altFilter).sort(altSort).skip(skip).limit(limit).lean(),
          Anime.countDocuments(altFilter),
        ]);
      }
    } else {
      ;[items, total] = await Promise.all([
        Anime.find(baseFilter).sort(sort).skip(skip).limit(limit).lean(),
        Anime.countDocuments(baseFilter),
      ]);
    }

    let external = [];
    if (q && page === 1 && items.length < 8) {
      try {
        const j = await jikanSearchAnime(q, 1);
        external = (j.data || []).slice(0, 6).map((row) => mapJikanAnimeToDoc(row));
      } catch {
        external = [];
      }
    }

    res.json({
      data: items,
      externalSuggestions: external,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/external/anilist', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ message: 'Query required' });
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const data = await anilistSearch(q, page, 10);
    const media = data.Page?.media || [];
    res.json({ data: media.map(mapAnilistMediaToPreview) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/:id/recommendations', async (req, res) => {
  try {
    const anime = await Anime.findById(req.params.id).lean();
    if (!anime) return res.status(404).json({ message: 'Anime not found' });
    const genre = anime.genres?.[0];
    const filter = genre ? { genres: genre, _id: { $ne: anime._id } } : { _id: { $ne: anime._id } };
    const recs = await Anime.find(filter).sort({ rating: -1 }).limit(12).lean();
    res.json({ data: recs });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const anime = await Anime.findById(id).lean();
    if (!anime) return res.status(404).json({ message: 'Anime not found' });

    let isFavorite = false;
    if (req.userId) {
      const fav = await Favorite.findOne({ userId: req.userId, animeId: anime._id });
      isFavorite = !!fav;
    }

    const episodes = await Episode.find({ animeId: anime._id })
      .sort({ season: 1, number: 1 })
      .select('season number title description thumbnail durationSeconds airedAt')
      .lean();

    res.json({ anime, episodes, isFavorite });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
