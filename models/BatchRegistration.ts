import mongoose from 'mongoose';

const BatchRegistrationSchema = new mongoose.Schema(
  {
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  charType: {
    type: String,
    enum: ['number', 'english', 'mixed'], // extended to mixed just in case
    required: true,
  },
  charLength: {
    type: Number,
    required: true,
    default: 8,
    min: 4,
    max: 20,
  },
  count: {
    type: Number,
    required: true,
    min: 1,
    max: 1000, // safety limit
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  durationDays: {
    type: Number,
    default: 1,
    min: 1,
    max: 365,
  },
  maxCount: {
    type: Number,
    default: 100,
    min: 1,
    max: 10000,
  },
  shareType: {
    type: String,
    enum: ['json', 'html'],
    default: 'html',
  },
  generatedAccounts: [{
    email: String,
    password: String,
    status: String,
    emailConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailConfig',
    },
  }],
  },
  { timestamps: true }
);

export default mongoose.models.BatchRegistration || mongoose.model('BatchRegistration', BatchRegistrationSchema);
