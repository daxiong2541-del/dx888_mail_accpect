import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
  username: {
    type: String,
    required: [true, 'Please provide a username for this user.'],
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password for this user.'],
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  },
  { timestamps: true }
);

const ExistingUserModel = mongoose.models.User;
if (ExistingUserModel && !ExistingUserModel.schema?.path('username')) {
  delete mongoose.models.User;
}

export default mongoose.models.User || mongoose.model('User', UserSchema);
