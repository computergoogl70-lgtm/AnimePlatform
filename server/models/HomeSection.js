import mongoose from 'mongoose';

const homeSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['trending', 'top_rated', 'recent', 'genre', 'custom'],
      default: 'custom',
    },
    genre: { type: String, default: '' },
    animeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Anime' }],
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('HomeSection', homeSectionSchema);
