import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    animeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true, index: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', default: null },
    text: { type: String, required: true, maxlength: 2000, trim: true },
  },
  { timestamps: true }
);

commentSchema.index({ animeId: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
