import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    animeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, animeId: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
