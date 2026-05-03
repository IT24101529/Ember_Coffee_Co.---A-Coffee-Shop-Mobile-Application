import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to Atlas');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role: { type: String, default: 'customer' },
  profileImageUrl: { type: String, default: '' },
  totalPoints: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const hash = await bcrypt.hash('Admin1234!', 10);
await User.findOneAndUpdate(
  { email: 'admin@embercoffee.com' },
  { name: 'Ember Admin', email: 'admin@embercoffee.com', passwordHash: hash, role: 'admin', totalPoints: 0 },
  { upsert: true, new: true }
);
console.log('Seed user upserted — users collection now exists in Atlas');
await mongoose.disconnect();
