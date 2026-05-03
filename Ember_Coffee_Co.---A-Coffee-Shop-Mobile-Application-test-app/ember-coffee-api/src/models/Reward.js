import { Schema, model } from 'mongoose';

const rewardSchema = new Schema(
  {
    rewardName:      { type: String, required: true },
    pointsRequired:  { type: Number, required: true, min: 1 },
    description:     { type: String, default: '' },
    rewardImageUrl:  { type: String, default: '' },
    isAvailable:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model('Reward', rewardSchema);
