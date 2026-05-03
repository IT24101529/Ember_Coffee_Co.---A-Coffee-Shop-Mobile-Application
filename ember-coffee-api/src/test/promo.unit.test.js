// Unit tests for promotions edge cases
// Validates: Requirements 10.1, 10.6, 10.7

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import Promotion from '../models/Promotion.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  createPromotion,
  validatePromoCode,
} from '../controllers/promoController.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

// ---------------------------------------------------------------------------
// Minimal Express app — mirrors the relevant routes without triggering the
// production DB connection.
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/promotions', protect, adminOnly, createPromotion);
  app.post('/api/promotions/validate/:promoCode', protect, validatePromoCode);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
function makeAdminToken() {
  return jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1h' },
  );
}

function makeCustomerToken() {
  return jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: 'customer' },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1h' },
  );
}

const adminToken = makeAdminToken();
const customerToken = makeCustomerToken();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Promotions edge cases', () => {
  // -------------------------------------------------------------------------
  // 1. Expired promo code → 404
  // Validates: Requirement 10.7
  // -------------------------------------------------------------------------
  describe('POST /api/promotions/validate/:promoCode — expired code', () => {
    test('returns 404 when the promo code has expired', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      await Promotion.create({
        promoCode: 'EXPIRED10',
        discountPercent: 10,
        validUntil: expiredDate,
      });

      const res = await request(app)
        .post('/api/promotions/validate/EXPIRED10')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Valid promo code → 200 with discountPercent
  // Validates: Requirement 10.6
  // -------------------------------------------------------------------------
  describe('POST /api/promotions/validate/:promoCode — valid code', () => {
    test('returns 200 with discountPercent for a valid future promo code', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await Promotion.create({
        promoCode: 'SAVE20',
        discountPercent: 20,
        validUntil: futureDate,
      });

      const res = await request(app)
        .post('/api/promotions/validate/SAVE20')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('discountPercent', 20);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Missing required fields on create → 400
  // Validates: Requirement 10.1
  // -------------------------------------------------------------------------
  describe('POST /api/promotions — missing required fields', () => {
    test('returns 400 when promoCode is missing', async () => {
      const res = await request(app)
        .post('/api/promotions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ discountPercent: 15, validUntil: new Date(Date.now() + 86400000) });

      expect(res.status).toBe(400);
    });

    test('returns 400 when discountPercent is missing', async () => {
      const res = await request(app)
        .post('/api/promotions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ promoCode: 'NODISCOUNT', validUntil: new Date(Date.now() + 86400000) });

      expect(res.status).toBe(400);
    });

    test('returns 400 when validUntil is missing', async () => {
      const res = await request(app)
        .post('/api/promotions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ promoCode: 'NODATE', discountPercent: 10 });

      expect(res.status).toBe(400);
    });

    test('returns 400 when all required fields are missing', async () => {
      const res = await request(app)
        .post('/api/promotions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
