import express from 'express';
import Favorite from '../models/Favorite.js';
import WatchHistory from '../models/WatchHistory.js';
import Anime from '../models/Anime.js';
import Episode from '../models/Episode.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/favorites', requireAuth, async (req, res) => {
  const favs = await Favorite.find({ userId: req.userId }).populate('animeId').lean();
  res.json({ data: favs.map((f) => f.animeId).filter(Boolean) });
});

router.post('/favorites/:animeId', requireAuth, async (req, res) => {
  const anime = await Anime.findById(req.params.animeId);
  if (!anime) return res.status(404).json({ message: 'Anime not found' });
  await Favorite.findOneAndUpdate(
    { userId: req.userId, animeId: anime._id },
    { userId: req.userId, animeId: anime._id },
    { upsert: true, new: true }
  );
  res.json({ ok: true });
});

router.delete('/favorites/:animeId', requireAuth, async (req, res) => {
  await Favorite.deleteOne({ userId: req.userId, animeId: req.params.animeId });
  res.json({ ok: true });
});

router.get('/watch-history', requireAuth, async (req, res) => {
  const items = await WatchHistory.find({ userId: req.userId })
    .sort({ lastWatchedAt: -1 })
    .limit(100)
    .populate('animeId')
    .populate('episodeId')
    .lean();
  res.json({ data: items });
});

router.get('/continue-watching', requireAuth, async (req, res) => {
  const items = await WatchHistory.find({ userId: req.userId, completed: false })
    .sort({ lastWatchedAt: -1 })
    .limit(20)
    .populate('animeId')
    .populate('episodeId')
    .lean();
  res.json({ data: items });
});

router.patch('/me', requireAuth, async (req, res) => {
  const allowed = ['displayName', 'avatarUrl', 'autoPlayNext', 'preferredSubtitleLang'];
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  for (const key of allowed) {
    if (req.body[key] !== undefined) user[key] = req.body[key];
  }
  await user.save();
  res.json({ user: user.toSafeJSON() });
});

export default router;
