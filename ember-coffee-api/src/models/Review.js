import { Schema, model } from 'mongoose';

const reviewSchema = new Schema(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    productId:     { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    rating:        { type: Number, required: true, min: 1, max: 5 },
    comment:       { type: String, default: '' },
    reviewImageUrl:{ type: String, default: '' },
  },
  { timestamps: true }
);

export default model('Review', reviewSchema);
