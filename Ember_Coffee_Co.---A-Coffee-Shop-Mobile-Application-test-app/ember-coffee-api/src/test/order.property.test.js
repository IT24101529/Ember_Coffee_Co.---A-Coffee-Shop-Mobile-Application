// Feature: ember-coffee-co, Property 16: New order is created with orderStatus === "Pending"
// Feature: ember-coffee-co, Property 17: Order history is scoped to the authenticated user
// Feature: ember-coffee-co, Property 18: Order status follows the defined state machine sequence
// Feature: ember-coffee-co, Property 14 (orders): Non-admin write requests return 403 (order status update)

import 'dotenv/config';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import orderRoutes from '../routes/orderRoutes.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

const { default: fc } = await import('fast-check');

// ---------------------------------------------------------------------------
// Minimal Express app — mirrors the relevant slice of server.js
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRoutes);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUserAndToken(role = 'customer') {
  const passwordHash = await bcrypt.hash('TestPass1!', 10);
  const user = await User.create({
    name: 'Test User',
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash,
    role,
  });
  const token = jwt.sign(
    { userId: user._id.toString(), role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' },
  );
  return { user, token };
}

/** Build a minimal valid order items array for the payload */
function makeItems(count = 1) {
  return Array.from({ length: count }, () => ({
    productId: new mongoose.Types.ObjectId().toString(),
    quantity: 1,
    price: 5.0,
  }));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid checkout payload: non-empty items array + positive totalAmount */
const checkoutPayloadArb = fc.record({
  items: fc.array(
    fc.record({
      productId: fc.constant(new mongoose.Types.ObjectId().toString()),
      quantity: fc.integer({ min: 1, max: 10 }),
      price: fc.float({ min: 0.5, max: 50, noNaN: true }),
    }),
    { minLength: 1, maxLength: 5 },
  ),
  totalAmount: fc.float({ min: 0.5, max: 500, noNaN: true }),
});

// ---------------------------------------------------------------------------
// Property 16: New order is created with orderStatus === "Pending"
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------
describe('Property 16: New order is created with orderStatus === "Pending"', () => {
  test(
    'POST /api/orders always creates an order with orderStatus === "Pending"',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          checkoutPayloadArb,
          async (payload) => {
            await Order.deleteMany({});
            await User.deleteMany({});

            const { token } = await createUserAndToken('customer');

            const res = await request(app)
              .post('/api/orders')
              .set('Authorization', `Bearer ${token}`)
              .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.orderStatus).toBe('Pending');
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});

// ---------------------------------------------------------------------------
// Property 17: Order history is scoped to the authenticated user
// Validates: Requirements 7.1
// ---------------------------------------------------------------------------
describe('Property 17: Order history is scoped to the authenticated user', () => {
  test(
    'GET /api/orders/my returns only orders belonging to the authenticated user',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),  // orders for target user
          fc.integer({ min: 1, max: 5 }),  // orders for other user
          async (myOrderCount, otherOrderCount) => {
            await Order.deleteMany({});
            await User.deleteMany({});

            const { user: myUser, token: myToken } = await createUserAndToken('customer');
            const { user: otherUser } = await createUserAndToken('customer');

            // Create orders for the target user
            for (let i = 0; i < myOrderCount; i++) {
              await Order.create({
                userId: myUser._id,
                items: makeItems(1),
                totalAmount: 10,
                orderStatus: 'Pending',
              });
            }

            // Create orders for another user
            for (let i = 0; i < otherOrderCount; i++) {
              await Order.create({
                userId: otherUser._id,
                items: makeItems(1),
                totalAmount: 10,
                orderStatus: 'Pending',
              });
            }

            const res = await request(app)
              .get('/api/orders/my')
              .set('Authorization', `Bearer ${myToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            // Every returned order must belong to the authenticated user
            for (const order of res.body) {
              expect(order.userId.toString()).toBe(myUser._id.toString());
            }

            // Count must match exactly
            expect(res.body.length).toBe(myOrderCount);
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});

// ---------------------------------------------------------------------------
// Property 18: Order status follows the defined state machine sequence
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------
describe('Property 18: Order status follows the defined state machine sequence', () => {
  test(
    'Valid transitions Pending→Brewing→Ready succeed; invalid transitions are rejected with 400',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Pick an invalid target status (anything not the next valid step)
          fc.constantFrom('Pending', 'Ready', 'Cancelled', 'Shipped', 'Done', ''),
          async (invalidStatus) => {
            await Order.deleteMany({});
            await User.deleteMany({});

            const { token: adminToken } = await createUserAndToken('admin');
            const { user: customer } = await createUserAndToken('customer');

            // Create a fresh Pending order
            const order = await Order.create({
              userId: customer._id,
              items: makeItems(1),
              totalAmount: 10,
              orderStatus: 'Pending',
            });

            // --- Valid transition: Pending → Brewing ---
            const brewRes = await request(app)
              .put(`/api/orders/${order._id}/status`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ orderStatus: 'Brewing' });

            expect(brewRes.status).toBe(200);
            expect(brewRes.body.orderStatus).toBe('Brewing');

            // --- Valid transition: Brewing → Ready ---
            const readyRes = await request(app)
              .put(`/api/orders/${order._id}/status`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ orderStatus: 'Ready' });

            expect(readyRes.status).toBe(200);
            expect(readyRes.body.orderStatus).toBe('Ready');

            // --- Invalid transition: already at Ready, any further update is rejected ---
            const invalidRes = await request(app)
              .put(`/api/orders/${order._id}/status`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ orderStatus: invalidStatus });

            expect(invalidRes.status).toBe(400);
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});

// ---------------------------------------------------------------------------
// Property 14 (orders): Non-admin write requests return 403 (order status update)
// Validates: Requirements 7.3
// ---------------------------------------------------------------------------
describe('Property 14 (orders): Non-admin write requests return 403 (order status update)', () => {
  test(
    'PUT /api/orders/:id/status by a customer returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Brewing', 'Ready', 'Pending'),
          async (targetStatus) => {
            await Order.deleteMany({});
            await User.deleteMany({});

            const { user: customer, token: customerToken } = await createUserAndToken('customer');

            // Create an order to attempt updating
            const order = await Order.create({
              userId: customer._id,
              items: makeItems(1),
              totalAmount: 10,
              orderStatus: 'Pending',
            });

            const res = await request(app)
              .put(`/api/orders/${order._id}/status`)
              .set('Authorization', `Bearer ${customerToken}`)
              .send({ orderStatus: targetStatus });

            expect(res.status).toBe(403);
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});
