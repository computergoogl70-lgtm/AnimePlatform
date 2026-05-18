import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    animeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true },
    progressSeconds: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

watchHistorySchema.index({ userId: 1, episodeId: 1 }, { unique: true });
watchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

export default mongoose.model('WatchHistory', watchHistorySchema);
