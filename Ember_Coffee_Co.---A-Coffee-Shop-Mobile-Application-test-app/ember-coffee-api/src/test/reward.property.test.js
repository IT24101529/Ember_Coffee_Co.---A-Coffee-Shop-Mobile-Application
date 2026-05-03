// Feature: ember-coffee-co, Property 9 (rewards): Resource list endpoints return only available items

/**
 * Validates: Requirements 8.3
 *
 * Property 9: Resource list endpoints return only available items (isAvailable === true) for rewards
 *   - For any collection of rewards with mixed isAvailable values, GET /api/rewards
 *     should return only documents where isAvailable === true.
 */

import 'dotenv/config';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Reward from '../models/Reward.js';
import User from '../models/User.js';
import Redemption from '../models/Redemption.js';
import { getRewards } from '../controllers/rewardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';
import rewardRoutes from '../routes/rewardRoutes.js';

const { default: fc } = await import('fast-check');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUserAndToken(role = 'customer') {
  const passwordHash = await bcrypt.hash('TestPass1!', 10);
  const user = await User.create({
    name: `Test ${role}`,
    email: `${role}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash,
    role,
    totalPoints: 0,
  });
  const token = jwt.sign(
    { userId: user._id.toString(), role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' },
  );
  return { user, token };
}

// ---------------------------------------------------------------------------
// Minimal Express app for GET /api/rewards (protect + getRewards)
// ---------------------------------------------------------------------------
function buildListApp() {
  const app = express();
  app.use(express.json());
  app.get('/api/rewards', protect, getRewards);
  app.use(errorMiddleware);
  return app;
}

const listApp = buildListApp();

// ---------------------------------------------------------------------------
// Minimal Express app with full rewardRoutes
// ---------------------------------------------------------------------------
function buildFullApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/rewards', rewardRoutes);
  app.use(errorMiddleware);
  return app;
}

const fullApp = buildFullApp();

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A single reward record with a random isAvailable flag. */
const rewardArb = fc.record({
  rewardName:     fc.string({ minLength: 1, maxLength: 50 }),
  pointsRequired: fc.integer({ min: 1, max: 500 }),
  description:    fc.string({ maxLength: 200 }),
  isAvailable:    fc.boolean(),
});

/** An array of 1–20 rewards with mixed isAvailable values. */
const rewardsArrayArb = fc.array(rewardArb, { minLength: 1, maxLength: 20 });

/** A valid reward creation payload (always available). */
const createRewardArb = fc.record({
  rewardName:     fc.string({ minLength: 1, maxLength: 50 }),
  pointsRequired: fc.integer({ min: 1, max: 500 }),
  description:    fc.string({ maxLength: 200 }),
  isAvailable:    fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 9 (rewards): Resource list endpoints return only available items
// Validates: Requirements 8.3
// ---------------------------------------------------------------------------
describe('Property 9 (rewards): Resource list endpoints return only available items', () => {
  test(
    'GET /api/rewards returns only rewards where isAvailable === true',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          rewardsArrayArb,
          async (rewards) => {
            await Reward.deleteMany({});
            await User.deleteMany({});
            await Redemption.deleteMany({});

            await Reward.insertMany(rewards);

            const { token } = await createUserAndToken('customer');

            const res = await request(listApp)
              .get('/api/rewards')
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            for (const reward of res.body) {
              expect(reward.isAvailable).toBe(true);
            }

            const expectedCount = rewards.filter((r) => r.isAvailable).length;
            expect(res.body.length).toBe(expectedCount);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});

// ---------------------------------------------------------------------------
// Property 19: Redemption deducts points and creates a record
// Validates: Requirements 8.9
// ---------------------------------------------------------------------------

/**
 * Validates: Requirements 8.9
 *
 * Property 19: Redemption deducts points and creates a record
 *   - totalPoints decremented by pointsRequired, Redemption document exists
 *   - For any reward with pointsRequired and a user with initialPoints >= pointsRequired,
 *     POST /api/rewards/:id/redeem should return 200 with updated totalPoints and
 *     a Redemption document should exist in the DB.
 */

describe('Property 19: Redemption deducts points and creates a record', () => {
  test(
    'POST /api/rewards/:id/redeem deducts points and creates a Redemption document',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }).chain((pointsRequired) =>
            fc.tuple(
              fc.constant(pointsRequired),
              fc.integer({ min: pointsRequired, max: pointsRequired + 500 }),
            ),
          ),
          async ([pointsRequired, initialPoints]) => {
            await Reward.deleteMany({});
            await User.deleteMany({});
            await Redemption.deleteMany({});

            const reward = await Reward.create({
              rewardName: 'Test Reward',
              pointsRequired,
              isAvailable: true,
            });

            const passwordHash = await bcrypt.hash('TestPass1!', 10);
            const user = await User.create({
              name: 'Test Customer',
              email: `customer_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
              passwordHash,
              role: 'customer',
              totalPoints: initialPoints,
            });

            const token = jwt.sign(
              { userId: user._id.toString(), role: 'customer' },
              process.env.JWT_SECRET || 'test_secret',
              { expiresIn: '1h' },
            );

            const res = await request(fullApp)
              .post(`/api/rewards/${reward._id}/redeem`)
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.totalPoints).toBe(initialPoints - pointsRequired);

            const redemption = await Redemption.findOne({
              userId: user._id,
              rewardId: reward._id,
            });
            expect(redemption).not.toBeNull();
            expect(redemption.pointsUsed).toBe(pointsRequired);
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});

// ---------------------------------------------------------------------------
// Property 20: Insufficient points prevents redemption
// Validates: Requirements 8.8, 8.10
// ---------------------------------------------------------------------------

/**
 * Validates: Requirements 8.8, 8.10
 *
 * Property 20: Insufficient points prevents redemption
 *   - Returns 400 and totalPoints unchanged
 *   - For any reward with pointsRequired and a user with initialPoints < pointsRequired,
 *     POST /api/rewards/:id/redeem should return 400 and the user's totalPoints in DB
 *     should remain unchanged.
 */

describe('Property 20: Insufficient points prevents redemption', () => {
  test(
    'POST /api/rewards/:id/redeem returns 400 and leaves totalPoints unchanged when points are insufficient',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 100 }).chain((pointsRequired) =>
            fc.tuple(
              fc.constant(pointsRequired),
              fc.integer({ min: 0, max: pointsRequired - 1 }),
            ),
          ),
          async ([pointsRequired, initialPoints]) => {
            await Reward.deleteMany({});
            await User.deleteMany({});
            await Redemption.deleteMany({});

            const reward = await Reward.create({
              rewardName: 'Test Reward',
              pointsRequired,
              isAvailable: true,
            });

            const passwordHash = await bcrypt.hash('TestPass1!', 10);
            const user = await User.create({
              name: 'Test Customer',
              email: `customer_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
              passwordHash,
              role: 'customer',
              totalPoints: initialPoints,
            });

            const token = jwt.sign(
              { userId: user._id.toString(), role: 'customer' },
              process.env.JWT_SECRET || 'test_secret',
              { expiresIn: '1h' },
            );

            const res = await request(fullApp)
              .post(`/api/rewards/${reward._id}/redeem`)
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(400);

            const userInDb = await User.findById(user._id);
            expect(userInDb.totalPoints).toBe(initialPoints);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});

// ---------------------------------------------------------------------------
// Property 14 (rewards): Non-admin write requests return 403
// Validates: Requirements 8.6
// ---------------------------------------------------------------------------

/**
 * Validates: Requirements 8.6
 *
 * Property 14 (rewards): Non-admin write requests return 403
 *   - For any write endpoint (POST/PUT/DELETE) on /api/rewards that requires admin role,
 *     a request made by an authenticated user with role === 'customer' should return HTTP 403.
 */

describe('Property 14 (rewards): Non-admin write requests return 403', () => {
  test(
    'POST/PUT/DELETE /api/rewards by a customer returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          createRewardArb,
          async (rewardData) => {
            await Reward.deleteMany({});
            await User.deleteMany({});
            await Redemption.deleteMany({});

            // Create a reward as admin so PUT/DELETE have a target
            const adminPasswordHash = await bcrypt.hash('AdminPass1!', 10);
            const admin = await User.create({
              name: 'Test Admin',
              email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
              passwordHash: adminPasswordHash,
              role: 'admin',
            });
            const adminToken = jwt.sign(
              { userId: admin._id.toString(), role: 'admin' },
              process.env.JWT_SECRET || 'test_secret',
              { expiresIn: '1h' },
            );

            const postAdminRes = await request(fullApp)
              .post('/api/rewards')
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ ...rewardData, isAvailable: true });
            expect(postAdminRes.status).toBe(201);
            const rewardId = postAdminRes.body._id;

            // Create a customer token
            const customerPasswordHash = await bcrypt.hash('CustomerPass1!', 10);
            const customer = await User.create({
              name: 'Test Customer',
              email: `customer_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
              passwordHash: customerPasswordHash,
              role: 'customer',
            });
            const customerToken = jwt.sign(
              { userId: customer._id.toString(), role: 'customer' },
              process.env.JWT_SECRET || 'test_secret',
              { expiresIn: '1h' },
            );

            // POST — customer attempts to create a reward
            const postRes = await request(fullApp)
              .post('/api/rewards')
              .set('Authorization', `Bearer ${customerToken}`)
              .send(rewardData);
            expect(postRes.status).toBe(403);

            // PUT — customer attempts to update the reward
            const putRes = await request(fullApp)
              .put(`/api/rewards/${rewardId}`)
              .set('Authorization', `Bearer ${customerToken}`)
              .send(rewardData);
            expect(putRes.status).toBe(403);

            // DELETE — customer attempts to delete the reward
            const deleteRes = await request(fullApp)
              .delete(`/api/rewards/${rewardId}`)
              .set('Authorization', `Bearer ${customerToken}`);
            expect(deleteRes.status).toBe(403);
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});
