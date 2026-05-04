// Feature: ember-coffee-co, Property 25: Promo code validation respects expiry
// Validates: Requirements 10.6, 10.7

/**
 * Validates: Requirements 10.6, 10.7
 *
 * Property 25: Promo code validation respects expiry
 *   - For any promo code that exists in the DB and whose validUntil is in the
 *     future, POST /api/promotions/validate/:promoCode returns HTTP 200 with
 *     { discountPercent }.
 *   - For any promo code that does not exist or whose validUntil has passed,
 *     the endpoint returns HTTP 404.
 */

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const { default: fc } = await import('fast-check');
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: Promotion } = await import('../models/Promotion.js');
const { protect } = await import('../middleware/authMiddleware.js');
const { validatePromoCode } = await import('../controllers/promoController.js');
const { errorMiddleware } = await import('../middleware/errorMiddleware.js');

// ---------------------------------------------------------------------------
// Minimal Express app — mirrors the relevant slice of server.js without
// triggering the production DB connection.
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/promotions/validate/:promoCode', protect, validatePromoCode);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a signed JWT for a customer user (matches protect middleware). */
function makeCustomerToken() {
  return jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: 'customer' },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1h' },
  );
}

/** A date clearly in the future (1 year from now). */
function futureDate() {
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
}

/** A date clearly in the past (1 year ago). */
function pastDate() {
  return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Uppercase alphanumeric promo codes of length 4–12.
 * The Promotion model stores promoCode as uppercase, so we generate uppercase
 * strings to avoid case-collision issues across runs.
 */
const promoCodeArb = fc
  .stringMatching(/^[A-Z0-9]{4,12}$/)
  .filter((s) => s.length >= 4);

/** discountPercent: integer 1–100 (schema min/max). */
const discountPercentArb = fc.integer({ min: 1, max: 100 });

// ---------------------------------------------------------------------------
// Property 25: Promo code validation respects expiry
// Validates: Requirements 10.6, 10.7
// ---------------------------------------------------------------------------
describe('Property 25: Promo code validation respects expiry', () => {
  const token = makeCustomerToken();

  // ------------------------------------------------------------------
  // Sub-property A: valid future code → 200 with discountPercent
  // ------------------------------------------------------------------
  test(
    'valid future promo code returns HTTP 200 with discountPercent',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          promoCodeArb,
          discountPercentArb,
          async (promoCode, discountPercent) => {
            // Insert a fresh promotion with a future expiry
            await Promotion.deleteMany({ promoCode });
            await Promotion.create({
              promoCode,
              discountPercent,
              validUntil: futureDate(),
            });

            const res = await request(app)
              .post(`/api/promotions/validate/${promoCode}`)
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('discountPercent', discountPercent);
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );

  // ------------------------------------------------------------------
  // Sub-property B: expired code → 404
  // ------------------------------------------------------------------
  test(
    'expired promo code returns HTTP 404',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          promoCodeArb,
          discountPercentArb,
          async (promoCode, discountPercent) => {
            // Insert a promotion that has already expired
            await Promotion.deleteMany({ promoCode });
            await Promotion.create({
              promoCode,
              discountPercent,
              validUntil: pastDate(),
            });

            const res = await request(app)
              .post(`/api/promotions/validate/${promoCode}`)
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );

  // ------------------------------------------------------------------
  // Sub-property C: non-existent code → 404
  // ------------------------------------------------------------------
  test(
    'non-existent promo code returns HTTP 404',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          promoCodeArb,
          async (promoCode) => {
            // Ensure the code does NOT exist in the DB
            await Promotion.deleteMany({ promoCode });

            const res = await request(app)
              .post(`/api/promotions/validate/${promoCode}`)
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );
});


// ---------------------------------------------------------------------------
// Property 14: Non-admin write requests return 403 (promotion create/update/delete)
// Validates: Requirements 10.5
// ---------------------------------------------------------------------------

import {
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '../controllers/promoController.js';
import { adminOnly } from '../middleware/authMiddleware.js';

function buildAdminApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/promotions',       protect, adminOnly, createPromotion);
  app.put('/api/promotions/:id',    protect, adminOnly, updatePromotion);
  app.delete('/api/promotions/:id', protect, adminOnly, deletePromotion);
  app.use(errorMiddleware);
  return app;
}

const adminApp = buildAdminApp();

/** Generate a signed JWT for a customer (non-admin) user. */
function makeNonAdminToken() {
  return jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: 'customer' },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1h' },
  );
}

/** A valid promotion payload. */
const validPromoPayloadArb = fc.record({
  promoCode:       promoCodeArb,
  discountPercent: discountPercentArb,
  validUntil:      fc.constant(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()),
});

describe('Property 14: Non-admin write requests return 403 (promotions)', () => {
  const customerToken = makeNonAdminToken();

  test(
    'customer POST /api/promotions returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          validPromoPayloadArb,
          async (payload) => {
            const res = await request(adminApp)
              .post('/api/promotions')
              .set('Authorization', `Bearer ${customerToken}`)
              .send(payload);

            expect(res.status).toBe(403);
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );

  test(
    'customer PUT /api/promotions/:id returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          validPromoPayloadArb,
          async (payload) => {
            // Create a promotion as a baseline (bypassing auth via direct DB insert)
            await Promotion.deleteMany({ promoCode: payload.promoCode });
            const promo = await Promotion.create(payload);

            const res = await request(adminApp)
              .put(`/api/promotions/${promo._id}`)
              .set('Authorization', `Bearer ${customerToken}`)
              .send({ discountPercent: 10 });

            expect(res.status).toBe(403);
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );

  test(
    'customer DELETE /api/promotions/:id returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          validPromoPayloadArb,
          async (payload) => {
            await Promotion.deleteMany({ promoCode: payload.promoCode });
            const promo = await Promotion.create(payload);

            const res = await request(adminApp)
              .delete(`/api/promotions/${promo._id}`)
              .set('Authorization', `Bearer ${customerToken}`);

            expect(res.status).toBe(403);
          },
        ),
        { numRuns: 100 },
      );
    },
    30000,
  );
});
