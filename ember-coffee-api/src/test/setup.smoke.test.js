// Mock connectDB before importing server so it doesn't attempt a real DB connection
import { jest } from '@jest/globals';

jest.unstable_mockModule('../config/db.js', () => ({
  default: jest.fn().mockResolvedValue(undefined),
}));

const { default: app } = await import('../server.js');
const { default: request } = await import('supertest');

describe('Smoke tests — shared setup', () => {
  test('GET /api/health returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
