import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --local flag targets MONGO_URI_TEST, otherwise MONGO_URI (Atlas)
const isLocal = process.argv.includes('--local');
const uri = isLocal ? process.env.MONGO_URI_TEST : process.env.MONGO_URI;
const target = isLocal ? 'Local' : 'Atlas';

if (!uri) {
  console.error(`Missing ${isLocal ? 'MONGO_URI_TEST' : 'MONGO_URI'} in .env`);
  process.exit(1);
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  _id:             mongoose.Schema.Types.ObjectId,
  name:            String,
  email:           { type: String, unique: true, lowercase: true },
  passwordHash:    String,
  role:            { type: String, default: 'customer' },
  profileImageUrl: { type: String, default: '' },
  totalPoints:     { type: Number, default: 0 },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  _id:             mongoose.Schema.Types.ObjectId,
  productName:     { type: String, required: true },
  category:        { type: String, required: true },
  price:           { type: Number, required: true },
  description:     { type: String, default: '' },
  productImageUrl: { type: String, default: '' },
  isAvailable:     { type: Boolean, default: true },
}, { timestamps: true });

const promotionSchema = new mongoose.Schema({
  _id:             mongoose.Schema.Types.ObjectId,
  promoCode:       { type: String, required: true, unique: true, uppercase: true },
  discountPercent: { type: Number, required: true },
  validUntil:      { type: Date, required: true },
  promoBannerUrl:  { type: String, default: '' },
}, { timestamps: true });

const rewardSchema = new mongoose.Schema({
  _id:            mongoose.Schema.Types.ObjectId,
  rewardName:     { type: String, required: true },
  pointsRequired: { type: Number, required: true },
  description:    { type: String, default: '' },
  rewardImageUrl: { type: String, default: '' },
  isAvailable:    { type: Boolean, default: true },
}, { timestamps: true });

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:  { type: Number, required: true },
  price:     { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  _id:                  mongoose.Schema.Types.ObjectId,
  userId:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items:                [orderItemSchema],
  totalAmount:          { type: Number, required: true },
  orderStatus:          {
    type: String,
    enum: ['Pending', 'Brewing', 'Ready', 'Delivering', 'Delivered'],
    default: 'Pending',
  },
  fulfillmentMethod:    { type: String, enum: ['Pickup', 'Delivery'], default: 'Pickup' },
  paymentScreenshotUrl: { type: String, default: '' },
  completedAt:          { type: Date, default: null },
}, { timestamps: true });

const storeReviewSchema = new mongoose.Schema({
  _id:            mongoose.Schema.Types.ObjectId,
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:         { type: Number, required: true },
  comment:        { type: String, default: '' },
  reviewImageUrl: { type: String, default: '' },
}, { timestamps: true });

// ── Models ────────────────────────────────────────────────────────────────────

const User        = mongoose.model('User',        userSchema);
const Product     = mongoose.model('Product',     productSchema);
const Promotion   = mongoose.model('Promotion',   promotionSchema);
const Reward      = mongoose.model('Reward',      rewardSchema);
const Order       = mongoose.model('Order',       orderSchema);
const StoreReview = mongoose.model('StoreReview', storeReviewSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

function load(filename) {
  return JSON.parse(readFileSync(resolve(root, filename), 'utf-8'));
}

async function upsertAll(Model, docs, label) {
  let count = 0;
  for (const doc of docs) {
    await Model.findByIdAndUpdate(doc._id, doc, { upsert: true, new: true, setDefaultsOnInsert: true });
    count++;
  }
  console.log(`  ✓ ${label}: ${count} upserted`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\nConnecting to ${target}...`);
await mongoose.connect(uri);
console.log('Connected.\n');

// Users — hash plain-text passwords before inserting
const rawUsers = load('users.json');
const users = await Promise.all(
  rawUsers.map(async (u) => ({
    ...u,
    _id: new mongoose.Types.ObjectId(u._id),
    passwordHash: await bcrypt.hash(u.passwordHash, 10),
  }))
);
await upsertAll(User, users, 'Users');

// Products
const products = load('products.json').map(p => ({
  ...p, _id: new mongoose.Types.ObjectId(p._id),
}));
await upsertAll(Product, products, 'Products');

// Promotions
const promotions = load('promotions.json').map(p => ({
  ...p, _id: new mongoose.Types.ObjectId(p._id),
}));
await upsertAll(Promotion, promotions, 'Promotions');

// Rewards
const rewards = load('rewards.json').map(r => ({
  ...r, _id: new mongoose.Types.ObjectId(r._id),
}));
await upsertAll(Reward, rewards, 'Rewards');

// Orders — cast nested ObjectIds too
const orders = load('orders.json').map(o => ({
  ...o,
  _id:    new mongoose.Types.ObjectId(o._id),
  userId: new mongoose.Types.ObjectId(o.userId),
  items:  o.items.map(i => ({ ...i, productId: new mongoose.Types.ObjectId(i.productId) })),
}));
await upsertAll(Order, orders, 'Orders');

// Store Reviews
const storeReviews = load('reviews.json').map(r => ({
  ...r,
  _id:    new mongoose.Types.ObjectId(r._id),
  userId: new mongoose.Types.ObjectId(r.userId),
}));
await upsertAll(StoreReview, storeReviews, 'Store Reviews');

console.log(`\nSeed complete (${target}).\n`);
await mongoose.disconnect();
