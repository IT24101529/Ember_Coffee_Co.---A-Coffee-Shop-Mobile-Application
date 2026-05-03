import { Schema, model } from 'mongoose';

const productSchema = new Schema(
  {
    productName:     { type: String, required: true },
    category:        { type: String, required: true },
    price:           { type: Number, required: true, min: 0 },
    description:     { type: String, default: '' },
    productImageUrl: { type: String, default: '' },
    isAvailable:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model('Product', productSchema);
