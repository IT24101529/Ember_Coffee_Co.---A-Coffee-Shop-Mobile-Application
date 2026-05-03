// Unit tests for review edge cases
// Validates: Requirements 9.6, 9.7

import 'dotenv/config';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import reviewRoutes from '../routes/reviewRoutes.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', reviewRoutes);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function createUser(role = 'customer') {
  const passwordHash = await bcrypt.hash('TestPass1!', 10);
  const user = await User.create({
    name: `User ${role}`,
    email: `${role}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash,
    role,
    totalPoints: 0,
  });
  const token = jwt.sign(
    { userId: user._id.toString(), role },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
  return { user, token };
}

async function createProduct() {
  return Product.create({
    productName: `Product ${Math.random().toString(36).slice(2)}`,
    category: 'Coffee',
    price: 5,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Review edge cases', () => {
  // -------------------------------------------------------------------------
  // Rating = 0 → 400
  // Validates: Requirement 9.7
  // -------------------------------------------------------------------------
  test('POST /api/reviews with rating 0 returns 400', async () => {
    const { user, token } = await createUser();
    const product = await createProduct();

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, rating: 0, comment: 'bad' });

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Rating = 6 → 400
  // Validates: Requirement 9.7
  // -------------------------------------------------------------------------
  test('POST /api/reviews with rating 6 returns 400', async () => {
    const { user, token } = await createUser();
    const product = await createProduct();

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product._id, rating: 6, comment: 'too high' });

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Non-owner delete → 403
  // Validates: Requirement 9.6
  // -------------------------------------------------------------------------
  test('DELETE /api/reviews/:id by non-owner returns 403', async () => {
    const { user: owner, token: ownerToken } = await createUser();
    const { token: otherToken } = await createUser();
    const product = await createProduct();

    const review = await Review.create({
      userId: owner._id,
      productId: product._id,
      rating: 4,
      comment: 'great',
    });

    const res = await request(app)
      .delete(`/api/reviews/${review._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);

    // Confirm review still exists
    const still = await Review.findById(review._id);
    expect(still).not.toBeNull();
  });
});
