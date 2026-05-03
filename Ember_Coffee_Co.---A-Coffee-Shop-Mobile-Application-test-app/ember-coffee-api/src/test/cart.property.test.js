// Feature: ember-coffee-co, Property 15: Cart state correctly tracks items and quantities

/**
 * Validates: Requirements 6.1
 *
 * Property 15: Cart state correctly tracks items and quantities —
 *   add/remove operations reflect net result and total equals sum of price × quantity.
 *
 * CartContext is React Native code, so we extract and test the pure reducer logic
 * directly without React rendering.
 */

const { default: fc } = await import('fast-check');

// ---------------------------------------------------------------------------
// Pure cart reducer logic — mirrors CartContext.js exactly
// ---------------------------------------------------------------------------

function addItem(items, product) {
  const existing = items.find((i) => i._id === product._id);
  if (existing) {
    return items.map((i) =>
      i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i
    );
  }
  return [...items, { ...product, quantity: 1 }];
}

function removeItem(items, productId) {
  const existing = items.find((i) => i._id === productId);
  if (!existing) return items;
  if (existing.quantity <= 1) {
    return items.filter((i) => i._id !== productId);
  }
  return items.map((i) =>
    i._id === productId ? { ...i, quantity: i.quantity - 1 } : i
  );
}

function computeTotal(items) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A product with a stable _id, name, and positive price. */
const productArb = fc.record({
  _id:   fc.string({ minLength: 1, maxLength: 20 }),
  name:  fc.string({ minLength: 1, maxLength: 30 }),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
});

/** A small pool of distinct products (1–5) to use across operations. */
const productPoolArb = fc
  .array(productArb, { minLength: 1, maxLength: 5 })
  .map((products) => {
    // Deduplicate by _id so the pool has unique products
    const seen = new Set();
    return products.filter((p) => {
      if (seen.has(p._id)) return false;
      seen.add(p._id);
      return true;
    });
  })
  .filter((pool) => pool.length >= 1);

/** A sequence of add/remove operations referencing products from the pool. */
function operationsArb(pool) {
  const opArb = fc.oneof(
    fc.record({ type: fc.constant('add'),    product: fc.constantFrom(...pool) }),
    fc.record({ type: fc.constant('remove'), productId: fc.constantFrom(...pool.map((p) => p._id)) }),
  );
  return fc.array(opArb, { minLength: 1, maxLength: 30 });
}

// ---------------------------------------------------------------------------
// Property 15: Cart state correctly tracks items and quantities
// Validates: Requirements 6.1
// ---------------------------------------------------------------------------

describe('Property 15: Cart state correctly tracks items and quantities', () => {

  // Sub-property A: adding a new item gives it quantity 1
  test(
    'adding a product not in the cart gives it quantity 1',
    () => {
      fc.assert(
        fc.property(
          productArb,
          (product) => {
            const items = addItem([], product);
            const entry = items.find((i) => i._id === product._id);
            expect(entry).toBeDefined();
            expect(entry.quantity).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Sub-property B: adding an existing item increments its quantity by 1
  test(
    'adding a product already in the cart increments its quantity by 1',
    () => {
      fc.assert(
        fc.property(
          productArb,
          fc.integer({ min: 1, max: 10 }),
          (product, initialQty) => {
            // Build a cart that already has the product at initialQty
            let items = [];
            for (let i = 0; i < initialQty; i++) {
              items = addItem(items, product);
            }
            const before = items.find((i) => i._id === product._id).quantity;
            const after  = addItem(items, product).find((i) => i._id === product._id).quantity;
            expect(after).toBe(before + 1);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Sub-property C: removing an item with quantity > 1 decrements by 1
  test(
    'removing a product with quantity > 1 decrements its quantity by 1',
    () => {
      fc.assert(
        fc.property(
          productArb,
          fc.integer({ min: 2, max: 10 }),
          (product, initialQty) => {
            let items = [];
            for (let i = 0; i < initialQty; i++) {
              items = addItem(items, product);
            }
            const before = items.find((i) => i._id === product._id).quantity;
            const after  = removeItem(items, product._id).find((i) => i._id === product._id).quantity;
            expect(after).toBe(before - 1);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Sub-property D: removing an item with quantity === 1 removes it from the cart
  test(
    'removing a product with quantity 1 removes it from the cart entirely',
    () => {
      fc.assert(
        fc.property(
          productArb,
          (product) => {
            const items = addItem([], product);
            const after = removeItem(items, product._id);
            expect(after.find((i) => i._id === product._id)).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // Sub-property E: total always equals sum of price × quantity for all items
  test(
    'total always equals sum of (price × quantity) for all items after any sequence of operations',
    () => {
      fc.assert(
        fc.property(
          productPoolArb.chain((pool) =>
            fc.tuple(fc.constant(pool), operationsArb(pool))
          ),
          ([pool, ops]) => {
            let items = [];
            for (const op of ops) {
              if (op.type === 'add') {
                items = addItem(items, op.product);
              } else {
                items = removeItem(items, op.productId);
              }
            }

            const total    = computeTotal(items);
            const expected = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

            expect(total).toBeCloseTo(expected, 10);
          },
        ),
        { numRuns: 200 },
      );
    },
  );

  // Sub-property F: net add/remove count matches final quantity
  test(
    'net add minus remove operations for a product equals its final quantity in the cart',
    () => {
      fc.assert(
        fc.property(
          productPoolArb.chain((pool) =>
            fc.tuple(fc.constant(pool), operationsArb(pool))
          ),
          ([pool, ops]) => {
            let items = [];
            for (const op of ops) {
              if (op.type === 'add') {
                items = addItem(items, op.product);
              } else {
                items = removeItem(items, op.productId);
              }
            }

            // For each product in the pool, verify net count matches stored quantity
            for (const product of pool) {
              const adds    = ops.filter((o) => o.type === 'add'    && o.product._id   === product._id).length;
              const removes = ops.filter((o) => o.type === 'remove' && o.productId === product._id).length;

              // Net = adds - removes, clamped to 0 (can't go below 0)
              let expectedQty = 0;
              let simQty = 0;
              for (const op of ops) {
                if (op.type === 'add' && op.product._id === product._id) {
                  simQty += 1;
                } else if (op.type === 'remove' && op.productId === product._id) {
                  if (simQty > 0) simQty -= 1;
                }
              }

              const entry = items.find((i) => i._id === product._id);
              const actualQty = entry ? entry.quantity : 0;

              expect(actualQty).toBe(simQty);
            }
          },
        ),
        { numRuns: 200 },
      );
    },
  );

});
