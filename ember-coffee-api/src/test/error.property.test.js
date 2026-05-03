// Feature: ember-coffee-co, Property 26: Error middleware returns 500 for unhandled errors
// Validates: Requirements 11.6

import { jest } from '@jest/globals';

const { default: fc } = await import('fast-check');
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { errorMiddleware } = await import('../middleware/errorMiddleware.js');

// ---------------------------------------------------------------------------
// Minimal Express app with a route that throws an unhandled error, followed
// by the errorMiddleware as the last handler — mirroring the real server.js
// setup.
// ---------------------------------------------------------------------------
function buildApp({ errorMessage, errorStatus } = {}) {
  const app = express();
  app.use(express.json());

  // Route that simulates an unhandled controller error
  app.get('/boom', (req, res, next) => {
    const err = new Error(errorMessage || 'Something went wrong');
    if (errorStatus !== undefined) err.status = errorStatus;
    next(err);
  });

  // Suppress console.error output during tests
  app.use((err, req, res, next) => {
    err._suppressLog = true;
    next(err);
  });

  app.use(errorMiddleware);
  return app;
}

// ---------------------------------------------------------------------------
// Property 26: Error middleware returns 500 for unhandled errors
// Validates: Requirements 11.6
// ---------------------------------------------------------------------------
describe('Property 26: Error middleware returns 500 for unhandled errors', () => {
  // Silence console.error for the duration of these tests
  beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterAll(() => jest.restoreAllMocks());

  test('any unhandled error (no status set) results in HTTP 500 with a JSON message field', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary non-empty error messages
        fc.string({ minLength: 1, maxLength: 200 }),
        async (errorMessage) => {
          const app = buildApp({ errorMessage });
          const res = await request(app).get('/boom');

          expect(res.status).toBe(500);
          expect(res.body).toHaveProperty('message');
          expect(typeof res.body.message).toBe('string');
        },
      ),
      { numRuns: 100 },
    );
  });

  test('errors with an explicit status code use that status, not 500', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Common non-500 HTTP error status codes
        fc.constantFrom(400, 401, 403, 404, 409, 422),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (errorStatus, errorMessage) => {
          const app = buildApp({ errorMessage, errorStatus });
          const res = await request(app).get('/boom');

          expect(res.status).toBe(errorStatus);
          expect(res.body).toHaveProperty('message');
        },
      ),
      { numRuns: 100 },
    );
  });

  test('response body is always valid JSON with a message field for any unhandled error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 300 }),
        async (errorMessage) => {
          const app = buildApp({ errorMessage });
          const res = await request(app).get('/boom');

          // Must be JSON content-type
          expect(res.headers['content-type']).toMatch(/application\/json/);
          expect(res.body).toHaveProperty('message');
        },
      ),
      { numRuns: 100 },
    );
  });
});
