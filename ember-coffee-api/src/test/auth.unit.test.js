/**
 * Unit tests for auth edge cases
 * Validates: Requirements 1.3, 2.2, 3.5
 */

import 'dotenv/config';
import express from 'express';

const { default: request } = await import('supertest');
const { register, login, updateProfile } = await import('../controllers/authController.js');
const { protect } = await import('../middleware/authMiddleware.js');
const { errorMiddleware } = await import('../middleware/errorMiddleware.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/auth/register', register);
  app.post('/api/auth/login', login);
  app.put('/api/auth/profile', protect, updateProfile);
  app.use(errorMiddleware);
  return app;
}

const app = buildApp();

const TEST_USER = {
  name: 'Test User',
  email: 'testuser@example.com',
  password: 'securepassword123',
};

describe('Auth edge cases', () => {
  // 1. Duplicate email → 409
  test('duplicate email registration returns 409', async () => {
    // First registration should succeed
    const first = await request(app).post('/api/auth/register').send(TEST_USER);
    expect(first.status).toBe(201);

    // Second registration with same email should fail
    const second = await request(app).post('/api/auth/register').send(TEST_USER);
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/email already in use/i);
  });

  // 2. Login with wrong password → 401
  test('login with wrong password returns 401', async () => {
    // Register the user first
    await request(app).post('/api/auth/register').send(TEST_USER);

    const res = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: 'wrongpassword999',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  // 3. Profile update without JWT → 401
  test('PUT /api/auth/profile without Authorization header returns 401', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({ name: 'New Name' });

    expect(res.status).toBe(401);
  });
});
