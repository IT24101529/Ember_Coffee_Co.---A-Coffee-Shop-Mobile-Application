// Unit tests for order edge cases
// Validates: Requirements 6.4, 7.5

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  createOrder,
  getMyOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

// ---------------------------------------------------------------------------
// Minimal Express app — mirrors the relevant order routes
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/orders',              protect,              createOrder);
  app.get('/api/orders/my',            protect,              getMyOrders);
  app.put('/api/orders/:id/status',    protect, adminOnly,   updateOrderStatus);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
function makeCustomerToken(userId) {
  return jwt.sign(
    { userId: userId || new mongoose.Types.ObjectId().toString(), role: 'customer' },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1h' },
  );
}

function makeAdminToken() {
  return jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: 'admin' },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1h' },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Order edge cases', () => {
  // -------------------------------------------------------------------------
  // 1. Empty items array → 400
  // Validates: Requirement 6.4
  // -------------------------------------------------------------------------
  describe('POST /api/orders — empty items array', () => {
    test('returns 400 when items is an empty array', async () => {
      const token = makeCustomerToken();

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [], totalAmount: 0 });

      expect(res.status).toBe(400);
    });

    test('returns 400 when items field is missing', async () => {
      const token = makeCustomerToken();

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ totalAmount: 10 });

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Order history for user with no orders → 200 []
  // Validates: Requirement 7.5
  // -------------------------------------------------------------------------
  describe('GET /api/orders/my — user with no orders', () => {
    test('returns 200 with an empty array when the user has no orders', async () => {
      const token = makeCustomerToken();

      const res = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Status update without JWT → 401
  // Validates: Requirement 7.5
  // -------------------------------------------------------------------------
  describe('PUT /api/orders/:id/status — no JWT', () => {
    test('returns 401 when no Authorization header is provided', async () => {
      const orderId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ orderStatus: 'Brewing' });

      expect(res.status).toBe(401);
    });

    test('returns 401 when an invalid token is provided', async () => {
      const orderId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', 'Bearer invalidtoken')
        .send({ orderStatus: 'Brewing' });

      expect(res.status).toBe(401);
    });
  });
});
