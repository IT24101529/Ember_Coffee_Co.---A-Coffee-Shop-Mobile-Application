// Feature: ember-coffee-co, Property 1: New user initialisation invariant
// Feature: ember-coffee-co, Property 2: Password is never stored in plaintext

/**
 * Validates: Requirements 1.1, 8.1
 *
 * Property 1: New user initialisation invariant
 *   - For any valid registration payload (name, email, password), the created
 *     User document should have role === "customer" and totalPoints === 0.
 *
 * Validates: Requirements 1.2
 *
 * Property 2: Password is never stored in plaintext
 *   - For any registration request with any password string, the stored
 *     passwordHash field should NOT equal the original password string.
 *   - bcrypt.compare(password, passwordHash) should return true.
 */

import 'dotenv/config';
import express from 'express';

const { default: fc } = await import('fast-check');
const { default: request } = await import('supertest');
const { default: bcrypt } = await import('bcryptjs');
const { default: User } = await import('../models/User.js');
const { register } = await import('../controllers/authController.js');
const { errorMiddleware } = await import('../middleware/errorMiddleware.js');

// ---------------------------------------------------------------------------
// Minimal Express app — mirrors the auth slice of server.js without
// triggering the production DB connection.
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/auth/register', register);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------------------
// Property 1: New user initialisation invariant
// Validates: Requirements 1.1, 8.1
// ---------------------------------------------------------------------------
describe('Property 1: New user initialisation invariant', () => {
  test(
    'new user always has role=customer and totalPoints=0',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name:     fc.string({ minLength: 1 }),
            email:    fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
          }),
          async (payload) => {
            const res = await request(app).post('/api/auth/register').send(payload);
            expect(res.status).toBe(201);
            const user = await User.findOne({ email: payload.email });
            expect(user.role).toBe('customer');
            expect(user.totalPoints).toBe(0);
          },
        ),
        { numRuns: 10 },
      );
    },
    60000,
  );
});

// ---------------------------------------------------------------------------
// Property 2: Password is never stored in plaintext
// Validates: Requirements 1.2
// ---------------------------------------------------------------------------
describe('Property 2: Password is never stored in plaintext', () => {
  test(
    'passwordHash is never equal to the original password and bcrypt.compare returns true',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name:     fc.string({ minLength: 1 }),
            email:    fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
          }),
          async (payload) => {
            const res = await request(app).post('/api/auth/register').send(payload);
            expect(res.status).toBe(201);
            const user = await User.findOne({ email: payload.email });
            expect(user.passwordHash).not.toBe(payload.password);
            const match = await bcrypt.compare(payload.password, user.passwordHash);
            expect(match).toBe(true);
          },
        ),
        { numRuns: 10 },
      );
    },
    60000,
  );
});


// ---------------------------------------------------------------------------
// Property 3: Missing required fields are rejected with 400
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------
describe('Property 3: Missing required fields are rejected with 400', () => {
  test(
    'registration with any missing required field always returns 400',
    async () => {
      // Generate payloads with at least one required field (name, email, password) omitted
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name:     fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            email:    fc.option(fc.emailAddress(),           { nil: undefined }),
            password: fc.option(fc.string({ minLength: 8 }), { nil: undefined }),
          }).filter(({ name, email, password }) =>
            // At least one field must be missing
            name === undefined || email === undefined || password === undefined
          ),
          async (payload) => {
            // Build body with only the defined fields
            const body = {};
            if (payload.name     !== undefined) body.name     = payload.name;
            if (payload.email    !== undefined) body.email    = payload.email;
            if (payload.password !== undefined) body.password = payload.password;

            const res = await request(app).post('/api/auth/register').send(body);
            expect(res.status).toBe(400);
          },
        ),
        { numRuns: 20 },
      );
    },
    60000,
  );
});

// Feature: ember-coffee-co, Property 5: Login with valid credentials returns a well-formed JWT containing userId and role
// ---------------------------------------------------------------------------
// Property 5: Login with valid credentials returns a well-formed JWT
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------
describe('Property 5: Login with valid credentials returns a well-formed JWT containing userId and role', () => {
  test(
    'login returns HTTP 200 with a JWT whose payload contains userId and role=customer',
    async () => {
      const { default: jwt } = await import('jsonwebtoken');
      const { login } = await import('../controllers/authController.js');

      const loginApp = express();
      loginApp.use(express.json());
      loginApp.post('/api/auth/register', register);
      loginApp.post('/api/auth/login', login);
      loginApp.use(errorMiddleware);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name:     fc.string({ minLength: 1 }),
            email:    fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
          }),
          async (payload) => {
            // Register first
            const regRes = await request(loginApp).post('/api/auth/register').send(payload);
            expect(regRes.status).toBe(201);

            // Then login with the same credentials
            const loginRes = await request(loginApp)
              .post('/api/auth/login')
              .send({ email: payload.email, password: payload.password });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.token).toBeDefined();

            // Decode and verify JWT payload shape
            const decoded = jwt.decode(loginRes.body.token);
            expect(typeof decoded.userId).toBe('string');
            expect(decoded.userId.length).toBeGreaterThan(0);
            expect(decoded.role).toBe('customer');
          },
        ),
        { numRuns: 10 },
      );
    },
    60000,
  );
});


// Feature: ember-coffee-co, Property 6: Login with invalid credentials returns 401
// ---------------------------------------------------------------------------
// Property 6: Login with invalid credentials returns 401
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------
describe('Property 6: Login with invalid credentials returns 401', () => {
  test(
    'login with unrecognised email or wrong password always returns 401',
    async () => {
      const { login } = await import('../controllers/authController.js');

      const loginApp = express();
      loginApp.use(express.json());
      loginApp.post('/api/auth/register', register);
      loginApp.post('/api/auth/login', login);
      loginApp.use(errorMiddleware);

      await fc.assert(
        fc.asyncProperty(
          // A registered user
          fc.record({
            name:     fc.string({ minLength: 1 }),
            email:    fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
          }),
          // A wrong credential — either a different email or a different password
          fc.oneof(
            // Wrong email: generate an email that differs from the registered one
            fc.emailAddress().map(wrongEmail => ({ type: 'wrongEmail', wrongEmail })),
            // Wrong password: generate a password that differs from the registered one
            fc.string({ minLength: 8 }).map(wrongPassword => ({ type: 'wrongPassword', wrongPassword })),
          ),
          async (payload, wrongCred) => {
            // Register the user first
            const regRes = await request(loginApp).post('/api/auth/register').send(payload);
            expect(regRes.status).toBe(201);

            let loginBody;
            if (wrongCred.type === 'wrongEmail') {
              // Use a different email (may or may not exist — either way should 401)
              if (wrongCred.wrongEmail === payload.email) return; // skip if same by chance
              loginBody = { email: wrongCred.wrongEmail, password: payload.password };
            } else {
              // Use the correct email but a wrong password
              if (wrongCred.wrongPassword === payload.password) return; // skip if same by chance
              loginBody = { email: payload.email, password: wrongCred.wrongPassword };
            }

            const loginRes = await request(loginApp).post('/api/auth/login').send(loginBody);
            expect(loginRes.status).toBe(401);
          },
        ),
        { numRuns: 10 },
      );
    },
    60000,
  );
});

// Feature: ember-coffee-co, Property 7: Protected routes reject requests without a valid JWT
// ---------------------------------------------------------------------------
// Property 7: Protected routes reject requests without a valid JWT
// Validates: Requirements 2.4, 3.5
// ---------------------------------------------------------------------------
const { protect } = await import('../middleware/authMiddleware.js');
const { getProfile, updateProfile } = await import('../controllers/authController.js');

describe('Property 7: Protected routes reject requests without a valid JWT', () => {

  const protectedApp = express();
  protectedApp.use(express.json());
  protectedApp.get('/api/auth/profile',  protect, getProfile);
  protectedApp.put('/api/auth/profile',  protect, updateProfile);
  protectedApp.use(errorMiddleware);

  const PROTECTED_ROUTES = [
    { method: 'get', path: '/api/auth/profile' },
    { method: 'put', path: '/api/auth/profile' },
  ];

  test(
    'request with no Authorization header always returns 401',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...PROTECTED_ROUTES),
          async ({ method, path }) => {
            const res = await request(protectedApp)[method](path).send({});
            expect(res.status).toBe(401);
          },
        ),
        { numRuns: 10 },
      );
    },
    30000,
  );

  test(
    'request with a malformed or invalid token always returns 401',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...PROTECTED_ROUTES),
          // Generate arbitrary strings that are not valid JWTs
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 64 }),          // random garbage
            fc.constant('Bearer '),                               // empty token
            fc.constant('NotBearer validtoken'),                  // wrong scheme
            fc.string({ minLength: 10 }).map(s => `Bearer ${s}`), // Bearer + junk
          ),
          async ({ method, path }, authHeader) => {
            const res = await request(protectedApp)[method](path)
              .set('Authorization', authHeader)
              .send({});
            expect(res.status).toBe(401);
          },
        ),
        { numRuns: 20 },
      );
    },
    60000,
  );
});

// Feature: ember-coffee-co, Property 8: Profile update persists changes — GET after PUT returns updated values
// ---------------------------------------------------------------------------
// Property 8: Profile update persists changes
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------
describe('Property 8: Profile update persists changes — GET after PUT returns updated values', () => {
  test(
    'PUT /api/auth/profile with a new name or profileImageUrl is reflected in subsequent GET',
    async () => {
      const { login } = await import('../controllers/authController.js');

      const profileApp = express();
      profileApp.use(express.json());
      profileApp.post('/api/auth/register', register);
      profileApp.post('/api/auth/login', login);
      profileApp.get('/api/auth/profile', protect, getProfile);
      profileApp.put('/api/auth/profile', protect, updateProfile);
      profileApp.use(errorMiddleware);

      await fc.assert(
        fc.asyncProperty(
          // Registered user payload
          fc.record({
            name:     fc.string({ minLength: 1 }),
            email:    fc.emailAddress(),
            password: fc.string({ minLength: 8 }),
          }),
          // Update payload — at least one field present
          fc.record({
            name:            fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            profileImageUrl: fc.option(fc.webUrl(),                 { nil: undefined }),
          }).filter(({ name, profileImageUrl }) =>
            name !== undefined || profileImageUrl !== undefined
          ),
          async (user, updates) => {
            // 1. Register
            const regRes = await request(profileApp).post('/api/auth/register').send(user);
            expect(regRes.status).toBe(201);

            // 2. Login to get token
            const loginRes = await request(profileApp)
              .post('/api/auth/login')
              .send({ email: user.email, password: user.password });
            expect(loginRes.status).toBe(200);
            const { token } = loginRes.body;

            // 3. Build update body from defined fields only
            const body = {};
            if (updates.name            !== undefined) body.name            = updates.name;
            if (updates.profileImageUrl !== undefined) body.profileImageUrl = updates.profileImageUrl;

            // 4. PUT /api/auth/profile
            const putRes = await request(profileApp)
              .put('/api/auth/profile')
              .set('Authorization', `Bearer ${token}`)
              .send(body);
            expect(putRes.status).toBe(200);

            // 5. GET /api/auth/profile — verify persisted values
            const getRes = await request(profileApp)
              .get('/api/auth/profile')
              .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(200);

            if (body.name !== undefined) {
              expect(getRes.body.name).toBe(body.name);
            }
            if (body.profileImageUrl !== undefined) {
              expect(getRes.body.profileImageUrl).toBe(body.profileImageUrl);
            }
          },
        ),
        { numRuns: 10 },
      );
    },
    60000,
  );
});
