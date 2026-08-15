import assert from 'assert';

const API = 'http://localhost:5000/api';

export async function runLevel2() {
  console.log('\n🔵 [LEVEL 2: PROJECTS, RBAC & CASCADING DELETION / RESTORE TEST]');
  const startTime = Date.now();
  let assertions = 0;

  // 1. Super Admin login
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'byten.in', password: 'byten1234' }),
  });
  const token = (await res.json()).data.token;

  // 2. Create a test project
  res = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: `Stress Project ${Date.now()}`, description: 'Cascade and isolation testing' }),
  });
  const project = (await res.json()).data;
  assert(project?.id, 'Project creation failed');
  assertions++;
  console.log(`  ✔ Project created: "${project.name}" (ID: ${project.id})`);

  // 3. Fetch auto-created lanes
  res = await fetch(`${API}/lanes/project/${project.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const lanes = (await res.json()).data;
  assert.strictEqual(lanes.length, 3, 'Project must initialize with 3 default lanes');
  assertions++;

  // 4. Create cards in lanes
  const cardIds = [];
  for (let i = 0; i < 5; i++) {
    res = await fetch(`${API}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: project.id,
        laneId: lanes[i % lanes.length].id,
        title: `Cascade Test Task ${i + 1}`,
        priority: 'HIGH',
      }),
    });
    const card = (await res.json()).data;
    assert(card?.id, `Card ${i + 1} creation failed`);
    cardIds.push(card.id);
  }
  assertions += 5;
  console.log(`  ✔ Populated project with 3 lanes and ${cardIds.length} cards`);

  // 5. Check global stats before deletion
  res = await fetch(`${API}/dashboard/global`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const globalBefore = (await res.json()).data;

  // 6. Delete the project (Cascading Soft-Delete)
  res = await fetch(`${API}/projects/${project.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(res.status, 200, 'Project deletion failed');
  assertions++;

  // 7. Verify global stats immediately dropped all lanes & cards
  res = await fetch(`${API}/dashboard/global`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const globalAfter = (await res.json()).data;
  assert.strictEqual(
    globalAfter.totalCards,
    globalBefore.totalCards - 5,
    'Global active cards must exclude soft-deleted project cards'
  );
  assert.strictEqual(
    globalAfter.totalLanes,
    globalBefore.totalLanes - 3,
    'Global active lanes must exclude soft-deleted project lanes'
  );
  assertions += 2;
  console.log('  ✔ Cascading soft-delete verified: 5 cards and 3 lanes removed from active metrics');

  // 8. Restore Project via Admin API
  res = await fetch(`${API}/admin/projects/${project.id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(res.status, 200, 'Project restore failed');
  assertions++;

  // 9. Verify global stats restored
  res = await fetch(`${API}/dashboard/global`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const globalRestored = (await res.json()).data;
  assert.strictEqual(globalRestored.totalCards, globalBefore.totalCards, 'Cards must be fully restored');
  assert.strictEqual(globalRestored.totalLanes, globalBefore.totalLanes, 'Lanes must be fully restored');
  assertions += 2;
  console.log('  ✔ Atomic project restoration verified: all cards and lanes cleanly restored');

  // Final cleanup
  await fetch(`${API}/projects/${project.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const duration = Date.now() - startTime;
  console.log(`✅ Level 2 Passed: ${assertions} assertions verified in ${duration}ms\n`);
  return { level: 2, name: 'Projects & Cascades', passed: true, assertions, duration };
}

if (process.argv[1]?.endsWith('test-level2-projects.js')) {
  runLevel2().catch((err) => {
    console.error('❌ Level 2 Failed:', err);
    process.exit(1);
  });
}
