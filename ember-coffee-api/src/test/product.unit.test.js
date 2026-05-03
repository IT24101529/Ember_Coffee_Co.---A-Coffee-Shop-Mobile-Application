// Unit tests for product edge cases
// Validates: Requirements 4.3, 5.5, 5.6

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getProductById,
  createProduct,
} from '../controllers/productController.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

// ---------------------------------------------------------------------------
// Minimal Express app — mirrors the relevant routes without triggering the
// production DB connection.
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/api/products/:id',  getProductById);
  app.post('/api/products',     protect, adminOnly, createProduct);
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

const adminToken    = makeAdminToken();
const customerToken = makeCustomerToken();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Product edge cases', () => {
  // -------------------------------------------------------------------------
  // 1. Non-existent productId → 404
  // Validates: Requirement 4.3
  // -------------------------------------------------------------------------
  describe('GET /api/products/:id — non-existent product', () => {
    test('returns 404 for a valid ObjectId that does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const res = await request(app).get(`/api/products/${nonExistentId}`);

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Customer creating product → 403
  // Validates: Requirement 5.5
  // -------------------------------------------------------------------------
  describe('POST /api/products — customer role', () => {
    test('returns 403 when a customer attempts to create a product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productName: 'Latte', category: 'Coffee', price: 4.5 });

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Missing required fields on create → 400
  // Validates: Requirement 5.6
  // -------------------------------------------------------------------------
  describe('POST /api/products — missing required fields', () => {
    test('returns 400 when productName is missing', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category: 'Coffee', price: 4.5 });

      expect(res.status).toBe(400);
    });

    test('returns 400 when category is missing', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productName: 'Latte', price: 4.5 });

      expect(res.status).toBe(400);
    });

    test('returns 400 when price is missing', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productName: 'Latte', category: 'Coffee' });

      expect(res.status).toBe(400);
    });

    test('returns 400 when all required fields are missing', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
