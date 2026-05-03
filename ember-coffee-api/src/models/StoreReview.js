import { Schema, model } from 'mongoose';

const storeReviewSchema = new Schema(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating:         { type: Number, required: true, min: 1, max: 5 },
    comment:        { type: String, default: '' },
    reviewImageUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

export default model('StoreReview', storeReviewSchema);
