import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'system',
    },
    dynmslApiToken: {
      type: String,
      default: '',
    },
    dynmslApiBaseUrl: {
      type: String,
      default: '',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);

