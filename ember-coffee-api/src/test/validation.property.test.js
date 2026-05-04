// Feature: ember-coffee-co, Property 4: Client-side validation rejects empty, whitespace-only, invalid email, or short password inputs

/**
 * Validates: Requirements 1.5
 *
 * Property 4: Client-side form validation rejects invalid inputs
 *   - For any input that is empty, whitespace-only, has an invalid email format,
 *     or has a password shorter than 8 characters, the validation function should
 *     return errors and prevent form submission.
 *
 * These are pure functions extracted from the React Native screens and tested
 * here using fast-check in the Node/Jest environment.
 */

const { default: fc } = await import('fast-check');

// ---------------------------------------------------------------------------
// Pure validation logic (mirrors LoginScreen.js and RegisterScreen.js)
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return Object.keys(errors).length ? errors : null;
}

function validateRegisterForm({ name, email, password }) {
  const errors = {};
  if (!name || !name.trim()) {
    errors.name = 'Name is required';
  }
  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return Object.keys(errors).length ? errors : null;
}

// ---------------------------------------------------------------------------
// Property 4a: Login form — invalid inputs always produce errors
// ---------------------------------------------------------------------------
describe('Property 4: Client-side login validation rejects invalid inputs', () => {
  test('empty or whitespace-only email always produces an email error', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 }),
        ),
        fc.string({ minLength: 8 }),
        (email, password) => {
          const errors = validateLoginForm({ email, password });
          expect(errors).not.toBeNull();
          expect(errors.email).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  test('invalid email format always produces an email error', () => {
    fc.assert(
      fc.property(
        // Strings that are non-empty but not valid email format
        fc.string({ minLength: 1 }).filter(
          (s) => s.trim().length > 0 && !EMAIL_REGEX.test(s.trim()),
        ),
        fc.string({ minLength: 8 }),
        (email, password) => {
          const errors = validateLoginForm({ email, password });
          expect(errors).not.toBeNull();
          expect(errors.email).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  test('password shorter than 8 characters always produces a password error', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 0, maxLength: 7 }),
        (email, password) => {
          const errors = validateLoginForm({ email, password });
          expect(errors).not.toBeNull();
          expect(errors.password).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  test('valid email and password >= 8 chars always passes validation', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        (email, password) => {
          const errors = validateLoginForm({ email, password });
          expect(errors).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4b: Register form — invalid inputs always produce errors
// ---------------------------------------------------------------------------
describe('Property 4: Client-side register validation rejects invalid inputs', () => {
  test('empty or whitespace-only name always produces a name error', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 }),
        ),
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        (name, email, password) => {
          const errors = validateRegisterForm({ name, email, password });
          expect(errors).not.toBeNull();
          expect(errors.name).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  test('invalid email format always produces an email error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }).filter(
          (s) => s.trim().length > 0 && !EMAIL_REGEX.test(s.trim()),
        ),
        fc.string({ minLength: 8 }),
        (name, email, password) => {
          const errors = validateRegisterForm({ name, email, password });
          expect(errors).not.toBeNull();
          expect(errors.email).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  test('password shorter than 8 characters always produces a password error', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.emailAddress(),
        fc.string({ minLength: 0, maxLength: 7 }),
        (name, email, password) => {
          const errors = validateRegisterForm({ name, email, password });
          expect(errors).not.toBeNull();
          expect(errors.password).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  test('valid name, email, and password >= 8 chars always passes validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        (name, email, password) => {
          const errors = validateRegisterForm({ name, email, password });
          expect(errors).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
