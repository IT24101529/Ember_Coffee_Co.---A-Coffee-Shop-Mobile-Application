import mongoose from 'mongoose';

// Connect to the test database before all tests
beforeAll(async () => {
  // Skip if already connected (e.g. another setup already ran)
  if (mongoose.connection.readyState !== 0) return;

  const uri = process.env.MONGO_URI_TEST || 'mongodb://localhost/ember-coffee-test';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
  } catch (err) {
    // If no test DB is available, tests that don't need MongoDB will still pass.
    // Integration tests that require a real connection will fail with a clear error.
    console.warn(`[test/setup.js] Could not connect to test DB: ${err.message}`);
  }
});

// Clear all collections before each test to ensure isolation
beforeEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
});

// Disconnect after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
