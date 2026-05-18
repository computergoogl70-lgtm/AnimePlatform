import mongoose from 'mongoose';

const subtitleSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    src: { type: String, required: true },
    srclang: { type: String, default: 'en' },
  },
  { _id: false }
);

const episodeSchema = new mongoose.Schema(
  {
    animeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true, index: true },
    season: { type: Number, default: 1 },
    number: { type: Number, required: true },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    streamSource: { type: String, enum: ['url', 'consumet'], default: 'url' },
    streamUrl: { type: String, default: '' },
    streamType: { type: String, enum: ['hls', 'mp4'], default: 'hls' },
    videoUrl: { type: String, default: '' },
    sourceType: {
      type: String,
      enum: ['mp4', 'm3u8', 'embed', 'iframe', 'external', 'auto'],
      default: 'auto',
    },
    consumetProvider: { type: String, default: '' },
    consumetEpisodeId: { type: String, default: '' },
    subtitles: [subtitleSchema],
    durationSeconds: { type: Number, default: 0 },
    thumbnail: { type: String, default: '' },
    airedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

episodeSchema.pre('validate', function validateStream() {
  // Synchronize new fields with old fields to maintain complete backward compatibility
  if (this.videoUrl && !this.streamUrl) {
    this.streamUrl = this.videoUrl;
  } else if (this.streamUrl && !this.videoUrl) {
    this.videoUrl = this.streamUrl;
  }

  if (this.sourceType && this.sourceType !== 'auto') {
    this.streamType = this.sourceType === 'mp4' ? 'mp4' : 'hls';
  }

  if (this.streamSource === 'consumet') {
    if (!this.consumetProvider || !this.consumetEpisodeId) {
      this.invalidate('consumetEpisodeId', 'Consumet provider and episode id are required');
    }
    return;
  }
  if (!this.streamUrl?.trim()) {
    this.invalidate('streamUrl', 'Stream URL is required for manual episodes');
  }
});

episodeSchema.index({ animeId: 1, season: 1, number: 1 }, { unique: true });

export default mongoose.model('Episode', episodeSchema);
