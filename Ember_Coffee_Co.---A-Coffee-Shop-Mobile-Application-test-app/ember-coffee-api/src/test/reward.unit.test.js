// Unit tests for rewards edge cases
// Validates: Requirements 8.7, 8.10, 8.11

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import Reward from '../models/Reward.js';
import User from '../models/User.js';
import Redemption from '../models/Redemption.js';
import rewardRoutes from '../routes/rewardRoutes.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

// ---------------------------------------------------------------------------
// Minimal Express app
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/rewards', rewardRoutes);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

function makeAdminToken() {
  return jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

function makeCustomerToken() {
  return jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: 'customer' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

const adminToken = makeAdminToken();
const customerToken = makeCustomerToken();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Rewards edge cases', () => {
  // -------------------------------------------------------------------------
  // 1. Redeem non-existent reward → 404
  // Validates: Requirement 8.11
  // -------------------------------------------------------------------------
  describe('POST /api/rewards/:id/redeem — non-existent reward', () => {
    test('returns 404 when reward does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/rewards/${nonExistentId}/redeem`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Redeem with 0 points → 400
  // Validates: Requirement 8.10
  // -------------------------------------------------------------------------
  describe('POST /api/rewards/:id/redeem — insufficient points', () => {
    test('returns 400 when user has 0 totalPoints', async () => {
      const reward = await Reward.create({
        rewardName: 'Free Coffee',
        pointsRequired: 10,
        isAvailable: true,
      });

      const user = await User.create({
        name: 'Test Customer',
        email: 'customer@test.com',
        passwordHash: 'hashedpassword',
        role: 'customer',
        totalPoints: 0,
      });

      const token = jwt.sign(
        { userId: user._id.toString(), role: 'customer' },
        JWT_SECRET,
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .post(`/api/rewards/${reward._id}/redeem`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Missing rewardName on create → 400
  // Validates: Requirement 8.7
  // -------------------------------------------------------------------------
  describe('POST /api/rewards — missing required fields', () => {
    test('returns 400 when rewardName is missing', async () => {
      const res = await request(app)
        .post('/api/rewards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ pointsRequired: 50 });

      expect(res.status).toBe(400);
    });

    // -----------------------------------------------------------------------
    // 4. Missing pointsRequired on create → 400
    // Validates: Requirement 8.7
    // -----------------------------------------------------------------------
    test('returns 400 when pointsRequired is missing', async () => {
      const res = await request(app)
        .post('/api/rewards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rewardName: 'Free Coffee' });

      expect(res.status).toBe(400);
    });
  });
});
