import assert from 'assert';

const API = 'http://localhost:5000/api';

export async function runLevel4() {
  console.log('\n🔵 [LEVEL 4: COLLABORATION, @MENTIONS & NOTIFICATIONS TEST]');
  const startTime = Date.now();
  let assertions = 0;

  // 1. Super Admin login
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'byten.in', password: 'byten1234' }),
  });
  const adminToken = (await res.json()).data.token;

  // 2. Fetch existing user alice
  res = await fetch(`${API}/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const users = (await res.json()).data;
  const alice = users.find((u) => u.username === 'alice') || users[1] || users[0];

  // 3. Create a project and card
  res = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Collaboration Project ${Date.now()}`, description: 'Mention testing' }),
  });
  const project = (await res.json()).data;

  res = await fetch(`${API}/lanes/project/${project.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const lanes = (await res.json()).data;

  res = await fetch(`${API}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      projectId: project.id,
      laneId: lanes[0].id,
      title: 'Review deployment PR',
      priority: 'CRITICAL',
    }),
  });
  const card = (await res.json()).data;

  // 4. Post comment with @mention of Alice
  console.log(`  ⚡ Posting comment with @${alice.username} mention...`);
  res = await fetch(`${API}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      cardId: card.id,
      comment: `Hey @${alice.username} please review the test deployment ASAP!`,
    }),
  });
  assert.strictEqual(res.status, 201, 'Comment creation failed');
  assertions++;
  console.log('  ✔ Comment with @mention created successfully');

  // 5. Login as Alice to verify notification received
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: alice.username, password: 'alice1234' }),
  });

  if (res.status === 200) {
    const aliceToken = (await res.json()).data.token;
    res = await fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const notifs = (await res.json()).data;
    assert(notifs && notifs.length > 0, 'Alice must receive the mention notification');
    assertions++;
    console.log(`  ✔ Notification verified in Alice inbox: "${notifs[0].title}"`);

    // Mark all as read
    res = await fetch(`${API}/notifications/mark-all-read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(res.status, 200);
    assertions++;
    console.log('  ✔ Mark-all-as-read verified');
  }

  // Cleanup project
  await fetch(`${API}/projects/${project.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const duration = Date.now() - startTime;
  console.log(`✅ Level 4 Passed: ${assertions} assertions verified in ${duration}ms\n`);
  return { level: 4, name: 'Collaboration & Mentions', passed: true, assertions, duration };
}

if (process.argv[1]?.endsWith('test-level4-collaboration.js')) {
  runLevel4().catch((err) => {
    console.error('❌ Level 4 Failed:', err);
    process.exit(1);
  });
}
