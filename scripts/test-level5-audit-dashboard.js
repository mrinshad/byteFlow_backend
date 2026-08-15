import assert from 'assert';

const API = 'http://localhost:5000/api';

export async function runLevel5() {
  console.log('\n🔵 [LEVEL 5: AUDIT LOGS EXPLORER & DASHBOARD METRICS TEST]');
  const startTime = Date.now();
  let assertions = 0;

  // 1. Super Admin login
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'byten.in', password: 'byten1234' }),
  });
  const token = (await res.json()).data.token;

  // 2. Query global dashboard statistics
  res = await fetch(`${API}/dashboard/global`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(res.status, 200);
  const globalStats = (await res.json()).data;
  assert(typeof globalStats.totalProjects === 'number', 'totalProjects must be a number');
  assert(typeof globalStats.totalCards === 'number', 'totalCards must be a number');
  assert(typeof globalStats.totalLanes === 'number', 'totalLanes must be a number');
  assertions += 4;
  console.log('  ✔ Dashboard global stats verified:', globalStats);

  // 3. Query Admin comprehensive stats
  res = await fetch(`${API}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(res.status, 200);
  const adminStats = (await res.json()).data;
  assert(adminStats.roleCounts, 'Admin stats must return roleCounts');
  assert(typeof adminStats.completionRate === 'number', 'completionRate must be numeric');
  assertions += 3;
  console.log('  ✔ Admin analytics verified:', adminStats.roleCounts, `Completion Rate: ${adminStats.completionRate}%`);

  // 4. Query Audit Logs with pagination & filters
  res = await fetch(`${API}/admin/activities?limit=10&page=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(res.status, 200);
  const activitiesRes = await res.json();
  assert(Array.isArray(activitiesRes.data), 'Activities must be an array');
  assert(activitiesRes.meta?.total >= 0, 'Pagination meta must exist');
  assertions += 3;
  console.log(`  ✔ Workspace Audit Logs verified (${activitiesRes.meta.total} total historical logs)`);

  const duration = Date.now() - startTime;
  console.log(`✅ Level 5 Passed: ${assertions} assertions verified in ${duration}ms\n`);
  return { level: 5, name: 'Audit Logs & Dashboard', passed: true, assertions, duration };
}

if (process.argv[1]?.endsWith('test-level5-audit-dashboard.js')) {
  runLevel5().catch((err) => {
    console.error('❌ Level 5 Failed:', err);
    process.exit(1);
  });
}
