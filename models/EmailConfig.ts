import mongoose from 'mongoose';

const EmailConfigSchema = new mongoose.Schema(
  {
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetEmail: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    default: '',
  },
  source: {
    type: String,
    enum: ['import', 'generated'],
    default: 'import',
  },
  shareType: {
    type: String,
    enum: ['json', 'html'],
    default: 'html',
  },
  durationDays: {
    type: Number,
    required: true,
    default: 1,
  },
  maxCount: {
    type: Number,
    required: true,
    default: 100,
  },
  receivedCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  },
  { timestamps: true }
);

export default mongoose.models.EmailConfig || mongoose.model('EmailConfig', EmailConfigSchema);
