import assert from 'assert';

const API = 'http://localhost:5000/api';

export async function runLevel1() {
  console.log('\n🔵 [LEVEL 1: AUTHENTICATION & SUPER ADMIN GOVERNANCE STRESS TEST]');
  const startTime = Date.now();
  let assertions = 0;

  // 1. Login as Super Admin (byten.in)
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'byten.in', password: 'byten1234' }),
  });
  const superAdminData = (await res.json()).data;
  const superAdminToken = superAdminData.token;
  assert.strictEqual(superAdminData.user.role, 'SUPER_ADMIN', 'Super Admin must have role SUPER_ADMIN');
  assertions++;
  console.log('  ✔ Super Admin login verified');

  // 2. Create a test standard Admin and test Member
  const testAdminUser = `test_adm_${Date.now()}`;
  const testMemberUser = `test_mem_${Date.now()}`;

  // Register standard Member
  res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Member', username: testMemberUser, password: 'password123' }),
  });
  const memberObj = (await res.json()).data?.user;
  assert(memberObj, 'Member registration failed');
  assertions++;

  // Super Admin promotes test Admin
  res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Admin', username: testAdminUser, password: 'password123' }),
  });
  const adminObj = (await res.json()).data?.user;
  assert(adminObj, 'Admin user creation failed');

  res = await fetch(`${API}/admin/users/${adminObj.id}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ role: 'ADMIN' }),
  });
  assert.strictEqual(res.status, 200, 'Super Admin promotion to ADMIN failed');
  assertions++;

  // Standard Admin logs in
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testAdminUser, password: 'password123' }),
  });
  const adminToken = (await res.json()).data.token;
  console.log('  ✔ Standard Admin created and authenticated');

  // 3. Negative Governance Tests: Standard Admin CANNOT alter Super Admin or other Admin
  // 3a. Admin attempts to change Super Admin role -> 403
  res = await fetch(`${API}/admin/users/${superAdminData.user.id}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'MEMBER' }),
  });
  assert.strictEqual(res.status, 403, 'Standard Admin must be rejected from altering Super Admin role');
  assertions++;

  // 3b. Admin attempts to lock Super Admin -> 403
  res = await fetch(`${API}/admin/users/${superAdminData.user.id}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isLocked: true }),
  });
  assert.strictEqual(res.status, 403, 'Standard Admin must be rejected from locking Super Admin');
  assertions++;

  // 3c. Admin attempts to reset password of Super Admin -> 403
  res = await fetch(`${API}/admin/users/${superAdminData.user.id}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ password: 'hacked1234' }),
  });
  assert.strictEqual(res.status, 403, 'Standard Admin must be rejected from resetting Super Admin password');
  assertions++;

  console.log('  ✔ Standard Admin restriction enforcement verified (403 Forbidden on Super Admin)');

  // 4. User Account Locking & Real-Time Token Rejection Stress
  // Super Admin locks Member
  res = await fetch(`${API}/admin/users/${memberObj.id}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ isLocked: true }),
  });
  assert.strictEqual(res.status, 200);
  assertions++;

  // Member attempts login while locked -> 403
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testMemberUser, password: 'password123' }),
  });
  const lockedRes = await res.json();
  assert.strictEqual(res.status, 403, 'Locked user login must return 403');
  assert(lockedRes.error?.message?.includes('locked'), 'Locked user must receive descriptive message');
  assertions++;
  console.log('  ✔ Account locking real-time enforcement verified');

  // Super Admin unlocks Member
  res = await fetch(`${API}/admin/users/${memberObj.id}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ isLocked: false }),
  });
  assert.strictEqual(res.status, 200);
  assertions++;

  // Member can login now
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testMemberUser, password: 'password123' }),
  });
  assert.strictEqual(res.status, 200, 'Unlocked user must be able to login');
  assertions++;
  console.log('  ✔ Account unlock and re-authentication verified');

  // Cleanup test users
  await fetch(`${API}/admin/users/${memberObj.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  await fetch(`${API}/admin/users/${adminObj.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const duration = Date.now() - startTime;
  console.log(`✅ Level 1 Passed: ${assertions} assertions verified in ${duration}ms\n`);
  return { level: 1, name: 'Auth & Governance', passed: true, assertions, duration };
}

if (process.argv[1]?.endsWith('test-level1-auth.js')) {
  runLevel1().catch((err) => {
    console.error('❌ Level 1 Failed:', err);
    process.exit(1);
  });
}
