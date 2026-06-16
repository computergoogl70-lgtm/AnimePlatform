import mongoose from "mongoose";

const animeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    bannerImage: { type: String, default: "" },
    genres: [{ type: String }],
    rating: { type: Number, default: 0 },
    malId: { type: Number, default: null },
    year: { type: Number, default: null },
    status: { type: String, default: "Unknown" },
    episodeCount: { type: Number, default: 0 },
    trailerUrl: { type: String, default: "" },
    trendingScore: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    popularity: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["manual", "jikan", "anilist", "consumet", "witanime"],
      default: "manual",
    },
    consumetProvider: { type: String, default: "" },
    consumetAnimeId: { type: String, default: "" },
    witanimeAnimeId: { type: String, default: "" },
  },
  { timestamps: true },
);

animeSchema.index({ title: "text", description: "text" });
animeSchema.index({ genres: 1 });
animeSchema.index({ year: 1 });
animeSchema.index({ rating: -1 });
animeSchema.index({ popularity: -1 });

export default mongoose.model("Anime", animeSchema);
