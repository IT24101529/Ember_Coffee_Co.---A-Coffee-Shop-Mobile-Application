import { Schema, model } from 'mongoose';

const redemptionSchema = new Schema(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rewardId:   { type: Schema.Types.ObjectId, ref: 'Reward', required: true },
    pointsUsed: { type: Number, required: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default model('Redemption', redemptionSchema);
