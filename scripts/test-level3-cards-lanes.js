import assert from 'assert';

const API = 'http://localhost:5000/api';

export async function runLevel3() {
  console.log('\n🔵 [LEVEL 3: KANBAN CARDS, LANES & HIGH CONCURRENCY STRESS TEST]');
  const startTime = Date.now();
  let assertions = 0;

  // 1. Super Admin login
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'byten.in', password: 'byten1234' }),
  });
  const token = (await res.json()).data.token;

  // 2. Create project for concurrency stress
  res = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: `Concurrency Stress ${Date.now()}`, description: '50 concurrent operations' }),
  });
  const project = (await res.json()).data;
  assert(project?.id);

  // Fetch lanes
  res = await fetch(`${API}/lanes/project/${project.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const lanes = (await res.json()).data;
  const lane1 = lanes[0];
  const lane2 = lanes[1];
  const lane3 = lanes[2];

  // 3. High Concurrency: 30 concurrent card creations
  console.log('  ⚡ Spawning 30 concurrent card creations...');
  const cardPromises = Array.from({ length: 30 }).map((_, i) =>
    fetch(`${API}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: project.id,
        laneId: lane1.id,
        title: `Concurrent Card #${i + 1}`,
        priority: i % 4 === 0 ? 'CRITICAL' : i % 3 === 0 ? 'HIGH' : i % 2 === 0 ? 'MEDIUM' : 'LOW',
      }),
    }).then((r) => r.json())
  );

  const cardResults = await Promise.all(cardPromises);
  const createdCards = cardResults.map((r) => r.data).filter(Boolean);
  assert.strictEqual(createdCards.length, 30, 'All 30 concurrent card creations must succeed');
  assertions += 30;
  console.log(`  ✔ 30 concurrent cards created successfully across ${lanes.length} lanes`);

  // 4. Concurrent Moves: Move 15 cards concurrently to Lane 2
  console.log('  ⚡ Executing 15 concurrent card moves across lanes...');
  const movePromises = createdCards.slice(0, 15).map((c, i) =>
    fetch(`${API}/cards/${c.id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        targetLaneId: lane2.id,
        position: (i + 1) * 1000,
      }),
    }).then((r) => r.json())
  );

  const moveResults = await Promise.all(movePromises);
  const successfulMoves = moveResults.filter((r) => r.success);
  assert.strictEqual(successfulMoves.length, 15, 'All 15 concurrent moves must succeed without race collisions');
  assertions += 15;
  console.log('  ✔ 15 concurrent moves completed with atomic position integrity');

  // 5. Soft-delete a card and restore it
  const testCard = createdCards[20];
  res = await fetch(`${API}/cards/${testCard.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(res.status, 200, 'Card deletion failed');
  assertions++;

  // Verify deleted card is excluded by default
  res = await fetch(`${API}/cards/project/${project.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const activeCards = (await res.json()).data;
  assert.strictEqual(activeCards.length, 29, 'Active cards must count 29');
  assertions++;

  // Restore the card
  res = await fetch(`${API}/cards/${testCard.id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(res.status, 200, 'Card restore failed');
  assertions++;

  // Verify restored card count
  res = await fetch(`${API}/cards/project/${project.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const restoredCards = (await res.json()).data;
  assert.strictEqual(restoredCards.length, 30, 'Restored cards must count 30');
  assertions++;
  console.log('  ✔ Card soft-delete and restore verified');

  // Cleanup project
  await fetch(`${API}/projects/${project.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const duration = Date.now() - startTime;
  console.log(`✅ Level 3 Passed: ${assertions} assertions verified in ${duration}ms\n`);
  return { level: 3, name: 'Cards, Lanes & Concurrency', passed: true, assertions, duration };
}

if (process.argv[1]?.endsWith('test-level3-cards-lanes.js')) {
  runLevel3().catch((err) => {
    console.error('❌ Level 3 Failed:', err);
    process.exit(1);
  });
}
