// Feature: ember-coffee-co, Property 9: Resource list endpoints return only available items

/**
 * Validates: Requirements 4.1
 *
 * Property 9: Resource list endpoints return only available items (isAvailable === true)
 *   - For any collection of products with mixed isAvailable values, GET /api/products
 *     should return only documents where isAvailable === true.
 */

import 'dotenv/config';
import express from 'express';
import request from 'supertest';
import Product from '../models/Product.js';
import { getProducts } from '../controllers/productController.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

const { default: fc } = await import('fast-check');

// ---------------------------------------------------------------------------
// Minimal Express app — mirrors the relevant slice of server.js
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/api/products', getProducts);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A single product record with a random isAvailable flag. */
const productArb = fc.record({
  productName: fc.string({ minLength: 1, maxLength: 50 }),
  category:    fc.constantFrom('Coffee', 'Tea', 'Pastry', 'Cold Brew', 'Snack'),
  price:       fc.float({ min: 0.5, max: 50, noNaN: true }),
  isAvailable: fc.boolean(),
});

/** An array of 1–20 products with mixed isAvailable values. */
const productsArrayArb = fc.array(productArb, { minLength: 1, maxLength: 20 });

// ---------------------------------------------------------------------------
// Property 9: Resource list endpoints return only available items
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------
describe('Property 9: Resource list endpoints return only available items', () => {
  test(
    'GET /api/products returns only products where isAvailable === true',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          productsArrayArb,
          async (products) => {
            // Clear products before each iteration to ensure isolation
            await Product.deleteMany({});

            // Insert the generated products into the test DB
            await Product.insertMany(products);

            const res = await request(app).get('/api/products');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);

            // Every returned product must be available
            for (const product of res.body) {
              expect(product.isAvailable).toBe(true);
            }

            // The count must match the number of available products inserted
            const expectedCount = products.filter((p) => p.isAvailable).length;
            expect(res.body.length).toBe(expectedCount);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});

// Feature: ember-coffee-co, Property 10: Fetch by ID returns full resource details

/**
 * Validates: Requirements 4.2
 *
 * Property 10: Fetch by ID returns full resource details for any existing product
 *   - For any product inserted into the database, GET /api/products/:id
 *     should return HTTP 200 with all schema fields matching the stored values.
 */

import { getProductById } from '../controllers/productController.js';

// ---------------------------------------------------------------------------
// Minimal Express app for fetch-by-ID
// ---------------------------------------------------------------------------
function buildByIdApp() {
  const app2 = express();
  app2.use(express.json());
  app2.get('/api/products/:id', getProductById);
  app2.use(errorMiddleware);
  return app2;
}

const byIdApp = buildByIdApp();

// ---------------------------------------------------------------------------
// Arbitrary for a single product with all optional fields populated
// ---------------------------------------------------------------------------
const fullProductArb = fc.record({
  productName:     fc.string({ minLength: 1, maxLength: 50 }),
  category:        fc.constantFrom('Coffee', 'Tea', 'Pastry', 'Cold Brew', 'Snack'),
  price:           fc.float({ min: 0.5, max: 50, noNaN: true }),
  description:     fc.string({ maxLength: 200 }),
  productImageUrl: fc.constant(''),
  isAvailable:     fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 10: Fetch by ID returns full resource details
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------
describe('Property 10: Fetch by ID returns full resource details', () => {
  test(
    'GET /api/products/:id returns all schema fields with matching values for any existing product',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fullProductArb,
          async (productData) => {
            // Clear and insert a single product
            await Product.deleteMany({});
            const inserted = await Product.create(productData);

            const res = await request(byIdApp).get(`/api/products/${inserted._id}`);

            expect(res.status).toBe(200);

            // All schema fields must be present and match stored values
            expect(res.body._id).toBe(inserted._id.toString());
            expect(res.body.productName).toBe(inserted.productName);
            expect(res.body.category).toBe(inserted.category);
            expect(res.body.price).toBeCloseTo(inserted.price, 5);
            expect(res.body.description).toBe(inserted.description);
            expect(res.body.productImageUrl).toBe(inserted.productImageUrl);
            expect(res.body.isAvailable).toBe(inserted.isAvailable);
            expect(res.body.createdAt).toBeDefined();
            expect(res.body.updatedAt).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});

// Feature: ember-coffee-co, Property 11: Admin resource creation is retrievable

/**
 * Validates: Requirements 5.1
 *
 * Property 11: Admin resource creation is retrievable — POST 201 then GET by _id returns matching fields
 *   - For any valid product payload submitted by an authenticated admin, after a successful
 *     POST /api/products (HTTP 201), GET /api/products/:id should return HTTP 200 with
 *     all submitted fields matching the response.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import productRoutes from '../routes/productRoutes.js';

// ---------------------------------------------------------------------------
// Minimal Express app with full auth middleware wired (no DB connect side-effect)
// ---------------------------------------------------------------------------
function buildAdminApp() {
  const adminApp = express();
  adminApp.use(express.json());
  adminApp.use('/api/products', productRoutes);
  // reuse the already-imported errorMiddleware from the top of this file
  adminApp.use(errorMiddleware);
  return adminApp;
}

const adminApp = buildAdminApp();

// ---------------------------------------------------------------------------
// Helper: create an admin user in the DB and return a signed JWT
// ---------------------------------------------------------------------------
async function createAdminAndToken() {
  const passwordHash = await bcrypt.hash('AdminPass1!', 10);
  const admin = await User.create({
    name: 'Test Admin',
    email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash,
    role: 'admin',
  });
  const token = jwt.sign(
    { userId: admin._id.toString(), role: 'admin' },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' },
  );
  return token;
}

// ---------------------------------------------------------------------------
// Arbitrary for a valid product creation payload
// ---------------------------------------------------------------------------
const createProductArb = fc.record({
  productName: fc.string({ minLength: 1, maxLength: 50 }),
  category:    fc.constantFrom('Coffee', 'Tea', 'Pastry', 'Cold Brew', 'Snack'),
  price:       fc.float({ min: 0.5, max: 50, noNaN: true }),
  description: fc.string({ maxLength: 200 }),
  isAvailable: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 11: Admin resource creation is retrievable
// Validates: Requirements 5.1
// ---------------------------------------------------------------------------
describe('Property 11: Admin resource creation is retrievable', () => {
  test(
    'POST /api/products (201) then GET /api/products/:id returns matching fields',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          createProductArb,
          async (productData) => {
            // Clear products and users before each iteration
            await Product.deleteMany({});
            await User.deleteMany({});

            const token = await createAdminAndToken();

            // POST — create the product as admin
            const postRes = await request(adminApp)
              .post('/api/products')
              .set('Authorization', `Bearer ${token}`)
              .send(productData);

            expect(postRes.status).toBe(201);
            const createdId = postRes.body._id;
            expect(createdId).toBeDefined();

            // GET — retrieve by _id
            const getRes = await request(adminApp).get(`/api/products/${createdId}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body._id).toBe(createdId);
            expect(getRes.body.productName).toBe(productData.productName);
            expect(getRes.body.category).toBe(productData.category);
            expect(getRes.body.price).toBeCloseTo(productData.price, 5);
            expect(getRes.body.description).toBe(productData.description);
            expect(getRes.body.isAvailable).toBe(productData.isAvailable);
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});

// Feature: ember-coffee-co, Property 12: Admin resource update persists changes

/**
 * Validates: Requirements 5.2
 *
 * Property 12: Admin resource update persists changes — PUT 200 then GET returns updated values
 *   - For any existing product and any valid update payload submitted by an authenticated admin,
 *     after a successful PUT /api/products/:id (HTTP 200), GET /api/products/:id should return
 *     the updated field values.
 */

// ---------------------------------------------------------------------------
// Arbitrary for a valid product update payload
// ---------------------------------------------------------------------------
const updateProductArb = fc.record({
  productName: fc.string({ minLength: 1, maxLength: 50 }),
  category:    fc.constantFrom('Coffee', 'Tea', 'Pastry', 'Cold Brew', 'Snack'),
  price:       fc.float({ min: 0.5, max: 50, noNaN: true }),
  description: fc.string({ maxLength: 200 }),
  isAvailable: fc.boolean(),
});

// ---------------------------------------------------------------------------
// Property 12: Admin resource update persists changes
// Validates: Requirements 5.2
// ---------------------------------------------------------------------------
describe('Property 12: Admin resource update persists changes', () => {
  test(
    'PUT /api/products/:id (200) then GET /api/products/:id returns updated field values',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          createProductArb,
          updateProductArb,
          async (initialData, updateData) => {
            // Clear products and users before each iteration
            await Product.deleteMany({});
            await User.deleteMany({});

            const token = await createAdminAndToken();

            // Create the initial product as admin
            const postRes = await request(adminApp)
              .post('/api/products')
              .set('Authorization', `Bearer ${token}`)
              .send(initialData);

            expect(postRes.status).toBe(201);
            const productId = postRes.body._id;
            expect(productId).toBeDefined();

            // PUT — update the product as admin
            const putRes = await request(adminApp)
              .put(`/api/products/${productId}`)
              .set('Authorization', `Bearer ${token}`)
              .send(updateData);

            expect(putRes.status).toBe(200);

            // GET — retrieve by _id and assert updated values
            const getRes = await request(adminApp).get(`/api/products/${productId}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body._id).toBe(productId);
            expect(getRes.body.productName).toBe(updateData.productName);
            expect(getRes.body.category).toBe(updateData.category);
            expect(getRes.body.price).toBeCloseTo(updateData.price, 5);
            expect(getRes.body.description).toBe(updateData.description);
            expect(getRes.body.isAvailable).toBe(updateData.isAvailable);
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});

// Feature: ember-coffee-co, Property 13: Admin resource deletion removes the resource

/**
 * Validates: Requirements 5.3
 *
 * Property 13: Admin resource deletion removes the resource — DELETE 200 then GET returns 404
 *   - For any existing product deleted by an authenticated admin (HTTP 200), a subsequent
 *     GET /api/products/:id should return HTTP 404.
 */

// ---------------------------------------------------------------------------
// Property 13: Admin resource deletion removes the resource
// Validates: Requirements 5.3
// ---------------------------------------------------------------------------
describe('Property 13: Admin resource deletion removes the resource', () => {
  test(
    'DELETE /api/products/:id (200) then GET /api/products/:id returns 404',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          createProductArb,
          async (productData) => {
            // Clear products and users before each iteration
            await Product.deleteMany({});
            await User.deleteMany({});

            const token = await createAdminAndToken();

            // POST — create the product as admin
            const postRes = await request(adminApp)
              .post('/api/products')
              .set('Authorization', `Bearer ${token}`)
              .send(productData);

            expect(postRes.status).toBe(201);
            const productId = postRes.body._id;
            expect(productId).toBeDefined();

            // DELETE — remove the product as admin
            const deleteRes = await request(adminApp)
              .delete(`/api/products/${productId}`)
              .set('Authorization', `Bearer ${token}`);

            expect(deleteRes.status).toBe(200);

            // GET — should now return 404
            const getRes = await request(adminApp).get(`/api/products/${productId}`);

            expect(getRes.status).toBe(404);
          },
        ),
        { numRuns: 100 },
      );
    },
    120000,
  );
});

// Feature: ember-coffee-co, Property 14: Non-admin write requests return 403

/**
 * Validates: Requirements 5.5
 *
 * Property 14: Non-admin write requests return 403
 *   - For any write endpoint (POST/PUT/DELETE) on /api/products that requires admin role,
 *     a request made by an authenticated user with role === 'customer' should return HTTP 403.
 */

// ---------------------------------------------------------------------------
// Helper: create a customer user in the DB and return a signed JWT
// ---------------------------------------------------------------------------
async function createCustomerAndToken() {
  const passwordHash = await bcrypt.hash('CustomerPass1!', 10);
  const customer = await User.create({
    name: 'Test Customer',
    email: `customer_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash,
    role: 'customer',
  });
  const token = jwt.sign(
    { userId: customer._id.toString(), role: 'customer' },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' },
  );
  return token;
}

// ---------------------------------------------------------------------------
// Property 14: Non-admin write requests return 403
// Validates: Requirements 5.5
// ---------------------------------------------------------------------------
describe('Property 14: Non-admin write requests return 403', () => {
  test(
    'POST/PUT/DELETE /api/products by a customer returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          createProductArb,
          async (productData) => {
            // Clear products and users before each iteration
            await Product.deleteMany({});
            await User.deleteMany({});

            // Create a product as admin so PUT/DELETE have a target
            const adminToken = await createAdminAndToken();
            const postAdminRes = await request(adminApp)
              .post('/api/products')
              .set('Authorization', `Bearer ${adminToken}`)
              .send(productData);
            expect(postAdminRes.status).toBe(201);
            const productId = postAdminRes.body._id;

            // Now get a customer token
            const customerToken = await createCustomerAndToken();

            // POST — customer attempts to create a product
            const postRes = await request(adminApp)
              .post('/api/products')
              .set('Authorization', `Bearer ${customerToken}`)
              .send(productData);
            expect(postRes.status).toBe(403);

            // PUT — customer attempts to update the product
            const putRes = await request(adminApp)
              .put(`/api/products/${productId}`)
              .set('Authorization', `Bearer ${customerToken}`)
              .send(productData);
            expect(putRes.status).toBe(403);

            // DELETE — customer attempts to delete the product
            const deleteRes = await request(adminApp)
              .delete(`/api/products/${productId}`)
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
