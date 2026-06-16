import express from "express";
import Anime from "../models/Anime.js";
import Episode from "../models/Episode.js";
import User from "../models/User.js";
import Banner from "../models/Banner.js";
import HomeSection from "../models/HomeSection.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { jikanGetAnimeByMalId, mapJikanAnimeToDoc } from "../services/jikan.js";
import { buildSlug } from "../utils/slug.js";
import {
  CONSUMET_PROVIDERS,
  consumetSearch,
  consumetAnimeInfo,
  assertWatchProvider,
} from "../services/consumet.js";
import { witanimeSearch, witanimeAnimeInfo } from "../services/witanime.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.post("/anime/import-jikan", async (req, res) => {
  const { malId } = req.body;
  if (!malId) return res.status(400).json({ message: "malId required" });
  const j = await jikanGetAnimeByMalId(malId);
  const doc = mapJikanAnimeToDoc(j);
  const existing = await Anime.findOne({
    $or: [{ malId: doc.malId }, { slug: doc.slug }],
  });
  if (existing) {
    return res
      .status(409)
      .json({ message: "Anime already exists", anime: existing });
  }
  const anime = await Anime.create(doc);
  res.status(201).json({ anime });
});

router.post("/anime", async (req, res) => {
  const payload = req.body;
  if (!payload.title)
    return res.status(400).json({ message: "Title required" });
  const slug = payload.slug || buildSlug(payload.title);
  const anime = await Anime.create({ ...payload, slug });
  res.status(201).json({ anime });
});

router.put("/anime/:id", async (req, res) => {
  const anime = await Anime.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!anime) return res.status(404).json({ message: "Not found" });
  res.json({ anime });
});

router.delete("/anime/:id", async (req, res) => {
  await Episode.deleteMany({ animeId: req.params.id });
  await Anime.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/consumet/providers", (req, res) => {
  res.json({ data: CONSUMET_PROVIDERS });
});

router.get("/consumet/search", async (req, res) => {
  const { provider, q } = req.query;
  if (!provider || !q?.trim()) {
    return res.status(400).json({ message: "provider and q are required" });
  }
  try {
    const data = await consumetSearch(provider, q.trim());
    res.json({ data });
  } catch (e) {
    res.status(502).json({ message: e.message || "Consumet search failed" });
  }
});

router.get("/consumet/info", async (req, res) => {
  const { provider, animeId } = req.query;
  if (!provider || !animeId) {
    return res
      .status(400)
      .json({ message: "provider and animeId are required" });
  }
  try {
    const info = await consumetAnimeInfo(provider, animeId);
    res.json({ info });
  } catch (e) {
    res.status(502).json({ message: e.message || "Consumet info failed" });
  }
});

router.get("/witanime/search", async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) {
    return res.status(400).json({ message: "q (query) is required" });
  }
  try {
    const data = await witanimeSearch(q.trim());
    res.json({ data });
  } catch (e) {
    res.status(502).json({ message: e.message || "Witanime search failed" });
  }
});

router.get("/witanime/info", async (req, res) => {
  const { animeId } = req.query;
  if (!animeId) {
    return res.status(400).json({ message: "animeId is required" });
  }
  try {
    const info = await witanimeAnimeInfo(animeId);
    res.json({ info });
  } catch (e) {
    res.status(502).json({ message: e.message || "Witanime info failed" });
  }
});

router.get("/anime/:id/episodes", async (req, res) => {
  const eps = await Episode.find({ animeId: req.params.id })
    .sort({ season: 1, number: 1 })
    .lean();
  res.json({ data: eps });
});

router.post("/anime/:id/episodes", async (req, res) => {
  const anime = await Anime.findById(req.params.id);
  if (!anime) return res.status(404).json({ message: "Anime not found" });
  const ep = await Episode.create({ ...req.body, animeId: anime._id });
  res.status(201).json({ episode: ep });
});

router.post("/anime/:id/episodes/import-consumet", async (req, res) => {
  const { provider, consumetAnimeId, season = 1 } = req.body;
  if (!provider || !consumetAnimeId) {
    return res
      .status(400)
      .json({ message: "provider and consumetAnimeId are required" });
  }
  try {
    assertWatchProvider(provider);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
  const anime = await Anime.findById(req.params.id);
  if (!anime) return res.status(404).json({ message: "Anime not found" });

  try {
    const info = await consumetAnimeInfo(provider, consumetAnimeId);
    const created = [];
    const skipped = [];

    for (const ep of info.episodes) {
      try {
        const doc = await Episode.create({
          animeId: anime._id,
          season: Number(season) || 1,
          number: ep.number,
          title: ep.title,
          description: "",
          streamSource: "consumet",
          consumetProvider: provider,
          consumetEpisodeId: ep.id,
          streamType: "hls",
        });
        created.push(doc);
      } catch (err) {
        if (err?.code === 11000) {
          skipped.push(ep.number);
        } else {
          throw err;
        }
      }
    }

    anime.consumetProvider = provider;
    anime.consumetAnimeId = consumetAnimeId;
    if (!anime.coverImage && info.image) anime.coverImage = info.image;
    if (!anime.description && info.description)
      anime.description = info.description;
    if (info.episodes?.length) anime.episodeCount = info.episodes.length;
    await anime.save();

    res.status(201).json({
      created: created.length,
      skipped,
      total: info.episodes.length,
    });
  } catch (e) {
    res.status(502).json({ message: e.message || "Consumet import failed" });
  }
});

router.post("/anime/:id/episodes/import-witanime", async (req, res) => {
  const { witanimeAnimeId, season = 1 } = req.body;
  if (!witanimeAnimeId) {
    return res.status(400).json({ message: "witanimeAnimeId is required" });
  }

  const anime = await Anime.findById(req.params.id);
  if (!anime) return res.status(404).json({ message: "Anime not found" });

  try {
    const info = await witanimeAnimeInfo(witanimeAnimeId);
    const created = [];
    const skipped = [];

    for (const ep of info.episodes) {
      try {
        const doc = await Episode.create({
          animeId: anime._id,
          season: Number(season) || 1,
          number: ep.number,
          title: ep.title,
          description: "",
          streamSource: "witanime",
          witanimeEpisodeId: ep.id,
          streamType: "mp4",
        });
        created.push(doc);
      } catch (err) {
        if (err?.code === 11000) {
          skipped.push(ep.number);
        } else {
          throw err;
        }
      }
    }

    anime.witanimeAnimeId = witanimeAnimeId;
    if (!anime.coverImage && info.image) anime.coverImage = info.image;
    if (!anime.description && info.description)
      anime.description = info.description;
    if (info.episodes?.length) anime.episodeCount = info.episodes.length;
    await anime.save();

    res.status(201).json({
      created: created.length,
      skipped,
      total: info.episodes.length,
    });
  } catch (e) {
    res.status(502).json({ message: e.message || "Witanime import failed" });
  }
});

router.put("/episodes/:id", async (req, res) => {
  const ep = await Episode.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!ep) return res.status(404).json({ message: "Not found" });
  res.json({ episode: ep });
});

router.delete("/episodes/:id", async (req, res) => {
  await Episode.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/users", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({}),
  ]);
  res.json({ data: users, page, limit, total });
});

router.patch("/users/:id", async (req, res) => {
  const { role } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  if (role && ["user", "admin"].includes(role)) user.role = role;
  await user.save();
  res.json({ user: user.toSafeJSON() });
});

router.get("/banners", async (req, res) => {
  const items = await Banner.find({}).sort({ order: 1 }).lean();
  res.json({ data: items });
});

router.post("/banners", async (req, res) => {
  const b = await Banner.create(req.body);
  res.status(201).json({ banner: b });
});

router.put("/banners/:id", async (req, res) => {
  const b = await Banner.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!b) return res.status(404).json({ message: "Not found" });
  res.json({ banner: b });
});

router.delete("/banners/:id", async (req, res) => {
  await Banner.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

router.get("/sections", async (req, res) => {
  const items = await HomeSection.find({}).sort({ order: 1 }).lean();
  res.json({ data: items });
});

router.post("/sections", async (req, res) => {
  const s = await HomeSection.create(req.body);
  res.status(201).json({ section: s });
});

router.put("/sections/:id", async (req, res) => {
  const s = await HomeSection.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!s) return res.status(404).json({ message: "Not found" });
  res.json({ section: s });
});

router.delete("/sections/:id", async (req, res) => {
  await HomeSection.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
