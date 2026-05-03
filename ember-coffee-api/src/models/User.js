import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name:            { type: String, required: true },
    email:           { type: String, required: true, unique: true, lowercase: true },
    passwordHash:    { type: String },
    role:            { type: String, enum: ['customer', 'admin', 'manager'], default: 'customer' },
    profileImageUrl: { type: String, default: '' },
    totalPoints:     { type: Number, default: 0, min: 0 },
    passwordResetOtp:     { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

export default model('User', userSchema);
