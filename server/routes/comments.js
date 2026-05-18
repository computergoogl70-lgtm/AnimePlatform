import express from 'express';
import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Anime from '../models/Anime.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.get('/', optionalAuth, async (req, res) => {
  const { animeId } = req.params;
  if (!mongoose.isValidObjectId(animeId)) {
    return res.status(400).json({ message: 'Invalid anime id' });
  }
  const comments = await Comment.find({ animeId })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('userId', 'displayName avatarUrl')
    .lean();
  res.json({ data: comments });
});

router.post('/', requireAuth, async (req, res) => {
  const { animeId } = req.params;
  const { text, episodeId } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text required' });
  const anime = await Anime.findById(animeId);
  if (!anime) return res.status(404).json({ message: 'Anime not found' });
  const c = await Comment.create({
    userId: req.userId,
    animeId,
    episodeId: episodeId || null,
    text: text.trim(),
  });
  const populated = await c.populate('userId', 'displayName avatarUrl');
  res.status(201).json({ comment: populated });
});

router.delete('/:commentId', requireAuth, async (req, res) => {
  const doc = await Comment.findById(req.params.commentId);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  if (doc.userId.toString() !== req.userId && req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await doc.deleteOne();
  res.json({ ok: true });
});

export default router;
