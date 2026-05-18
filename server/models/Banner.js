import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    title: { type: String, default: '' },
    animeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', default: null },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Banner', bannerSchema);
