// Feature: ember-coffee-co, Property 21: Reviews are scoped to their productId
// Feature: ember-coffee-co, Property 22: Review owner can update their review
// Feature: ember-coffee-co, Property 23: Non-owner cannot edit or delete a review
// Feature: ember-coffee-co, Property 24: Rating outside 1–5 is rejected with 400

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

const { default: fc } = await import('fast-check');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
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
async function createUser(role = 'customer', points = 0) {
  const passwordHash = await bcrypt.hash('TestPass1!', 10);
  const user = await User.create({
    name: `User ${role}`,
    email: `${role}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash,
    role,
    totalPoints: points,
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
// Arbitraries
// ---------------------------------------------------------------------------
const ratingArb = fc.integer({ min: 1, max: 5 });
const commentArb = fc.string({ maxLength: 200 });

// ---------------------------------------------------------------------------
// Property 21: Reviews are scoped to their productId
// Validates: Requirements 9.3
// ---------------------------------------------------------------------------
describe('Property 21: Reviews are scoped to their productId', () => {
  test(
    'GET /api/reviews/product/:productId returns only reviews for that product',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(ratingArb, { minLength: 1, maxLength: 5 }),
          fc.array(ratingArb, { minLength: 1, maxLength: 5 }),
          async (ratingsA, ratingsB) => {
            await Review.deleteMany({});
            await User.deleteMany({});
            await Product.deleteMany({});

            const { user, token } = await createUser();
            const productA = await createProduct();
            const productB = await createProduct();

            for (const rating of ratingsA) {
              await Review.create({ userId: user._id, productId: productA._id, rating });
            }
            for (const rating of ratingsB) {
              await Review.create({ userId: user._id, productId: productB._id, rating });
            }

            const res = await request(app)
              .get(`/api/reviews/product/${productA._id}`)
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(ratingsA.length);
            for (const review of res.body) {
              expect(review.productId.toString()).toBe(productA._id.toString());
            }
          },
        ),
        { numRuns: 50 },
      );
    },
    60000,
  );
});

// ---------------------------------------------------------------------------
// Property 22: Review owner can update their review
// Validates: Requirements 9.4
// ---------------------------------------------------------------------------
describe('Property 22: Review owner can update their review', () => {
  test(
    'PUT /api/reviews/:id by owner returns 200 and persists updated values',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          ratingArb,
          ratingArb,
          commentArb,
          async (initialRating, newRating, newComment) => {
            await Review.deleteMany({});
            await User.deleteMany({});
            await Product.deleteMany({});

            const { user, token } = await createUser();
            const product = await createProduct();

            const review = await Review.create({
              userId: user._id,
              productId: product._id,
              rating: initialRating,
            });

            const putRes = await request(app)
              .put(`/api/reviews/${review._id}`)
              .set('Authorization', `Bearer ${token}`)
              .send({ rating: newRating, comment: newComment });

            expect(putRes.status).toBe(200);
            expect(putRes.body.rating).toBe(newRating);
            expect(putRes.body.comment).toBe(newComment);

            const getRes = await request(app)
              .get(`/api/reviews/product/${product._id}`);

            expect(getRes.status).toBe(200);
            const updated = getRes.body.find((r) => r._id === review._id.toString());
            expect(updated.rating).toBe(newRating);
            expect(updated.comment).toBe(newComment);
          },
        ),
        { numRuns: 50 },
      );
    },
    60000,
  );
});

// ---------------------------------------------------------------------------
// Property 23: Non-owner cannot edit or delete a review
// Validates: Requirements 9.6
// ---------------------------------------------------------------------------
describe('Property 23: Non-owner cannot edit or delete a review', () => {
  test(
    'PUT/DELETE /api/reviews/:id by non-owner returns 403 and review is unchanged',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          ratingArb,
          ratingArb,
          async (originalRating, attemptedRating) => {
            await Review.deleteMany({});
            await User.deleteMany({});
            await Product.deleteMany({});

            const { user: owner, token: ownerToken } = await createUser();
            const { token: otherToken } = await createUser();
            const product = await createProduct();

            const review = await Review.create({
              userId: owner._id,
              productId: product._id,
              rating: originalRating,
              comment: 'original',
            });

            const putRes = await request(app)
              .put(`/api/reviews/${review._id}`)
              .set('Authorization', `Bearer ${otherToken}`)
              .send({ rating: attemptedRating, comment: 'hacked' });

            expect(putRes.status).toBe(403);

            const deleteRes = await request(app)
              .delete(`/api/reviews/${review._id}`)
              .set('Authorization', `Bearer ${otherToken}`);

            expect(deleteRes.status).toBe(403);

            // Review should be unchanged
            const unchanged = await Review.findById(review._id);
            expect(unchanged).not.toBeNull();
            expect(unchanged.rating).toBe(originalRating);
            expect(unchanged.comment).toBe('original');
          },
        ),
        { numRuns: 50 },
      );
    },
    60000,
  );
});

// ---------------------------------------------------------------------------
// Property 24: Rating outside 1–5 is rejected with 400
// Validates: Requirements 9.7
// ---------------------------------------------------------------------------
describe('Property 24: Rating outside 1–5 is rejected with 400', () => {
  test(
    'POST /api/reviews with rating < 1 or > 5 returns 400 and no Review is created',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 6 }),
          ),
          async (invalidRating) => {
            await Review.deleteMany({});
            await User.deleteMany({});
            await Product.deleteMany({});

            const { user, token } = await createUser();
            const product = await createProduct();

            const countBefore = await Review.countDocuments();

            const res = await request(app)
              .post('/api/reviews')
              .set('Authorization', `Bearer ${token}`)
              .send({ productId: product._id, rating: invalidRating, comment: 'test' });

            expect(res.status).toBe(400);

            const countAfter = await Review.countDocuments();
            expect(countAfter).toBe(countBefore);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});
