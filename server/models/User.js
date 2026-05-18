import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    displayName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    autoPlayNext: { type: Boolean, default: true },
    preferredSubtitleLang: { type: String, default: 'en' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    role: this.role,
    autoPlayNext: this.autoPlayNext,
    preferredSubtitleLang: this.preferredSubtitleLang,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
