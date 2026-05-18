// tests/api.test.js
// Run with: node tests/api.test.js
// Make sure server is running on localhost:3000 first

const BASE = 'http://localhost:3000';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

(async () => {
  console.log('\nRecallWatch API Tests\n' + '─'.repeat(40));

  // ── GET /api/recalls ──────────────────────────────────
  console.log('\n[GET /api/recalls]');

  await test('returns 200 and results array', async () => {
    const res = await fetch(`${BASE}/api/recalls?limit=5`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.results), 'Expected results array');
    assert(data.results.length > 0, 'Expected at least one result');
  });

  await test('filters by classification Class I', async () => {
    const res = await fetch(`${BASE}/api/recalls?classification=Class+I&limit=5`);
    const data = await res.json();
    assert(Array.isArray(data.results), 'Expected results array');
    data.results.forEach(r => {
      assert(r.classification === 'Class I', `Expected Class I, got ${r.classification}`);
    });
  });

  await test('filters by state MD', async () => {
    const res = await fetch(`${BASE}/api/recalls?state=MD&limit=5`);
    const data = await res.json();
    assert(Array.isArray(data.results), 'Expected results array');
  });

  await test('count endpoint returns aggregated data', async () => {
    const res = await fetch(`${BASE}/api/recalls?count=classification.exact`);
    const data = await res.json();
    assert(Array.isArray(data.results), 'Expected results array');
    assert(data.results[0].term, 'Expected term field');
    assert(data.results[0].count, 'Expected count field');
  });

  // ── GET /api/saved ────────────────────────────────────
  console.log('\n[GET /api/saved]');

  await test('returns 200 and an array', async () => {
    const res = await fetch(`${BASE}/api/saved`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data), 'Expected array response');
  });

  // ── POST /api/saved ───────────────────────────────────
  console.log('\n[POST /api/saved]');

  const testRecall = {
    event_id: 'TEST-001',
    product_description: 'Test Peanut Butter — 16oz jars',
    reason_for_recall: 'Possible Salmonella contamination',
    classification: 'Class I',
    recalling_firm: 'Test Foods Inc.',
    report_date: '20260101',
    state: 'MD'
  };

  await test('saves a recall and returns 201', async () => {
    const res = await fetch(`${BASE}/api/saved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRecall)
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    const data = await res.json();
    assert(data.message, 'Expected success message');
  });

  await test('rejects missing required fields', async () => {
    const res = await fetch(`${BASE}/api/saved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason_for_recall: 'Missing required fields' })
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // ── DELETE /api/saved/:id ─────────────────────────────
  console.log('\n[DELETE /api/saved/:id]');

  await test('deletes a saved recall', async () => {
    const res = await fetch(`${BASE}/api/saved/TEST-001`, { method: 'DELETE' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ── Summary ───────────────────────────────────────────
  console.log('\n' + '─'.repeat(40));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
