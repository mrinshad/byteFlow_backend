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

  // 2. Test User Creation in Admin Section & Role Restrictions
  const testAdminUser = `test_adm_${Date.now()}`;
  const testMemberUser = `test_mem_${Date.now()}`;
  const testManagerUser = `test_mgr_${Date.now()}`;

  // 2a. Attempt to create another SUPER_ADMIN -> Must be rejected with 400
  res = await fetch(`${API}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ name: 'Fake Super', username: `fake_super_${Date.now()}`, password: 'password123', role: 'SUPER_ADMIN' }),
  });
  assert.strictEqual(res.status, 400, 'Creating another SUPER_ADMIN must return 400');
  assertions++;
  console.log('  ✔ Single Super Admin rule verified (Creation of second Super Admin rejected with 400)');

  // 2b. Super Admin creates a new ADMIN user
  res = await fetch(`${API}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ name: 'Test Admin', username: testAdminUser, password: 'password123', role: 'ADMIN' }),
  });
  assert.strictEqual(res.status, 201, 'Super Admin must be able to create new ADMIN users');
  const adminObj = (await res.json()).data;
  assert.strictEqual(adminObj.role, 'ADMIN');
  assertions += 2;
  console.log('  ✔ Super Admin created new Administrator user successfully');

  // Standard Admin logs in
  res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testAdminUser, password: 'password123' }),
  });
  const adminToken = (await res.json()).data.token;
  assert(adminToken, 'Admin login failed');
  assertions++;
  console.log('  ✔ Standard Admin authenticated');

  // 2c. Standard Admin attempts to create an ADMIN user -> 403 Forbidden
  res = await fetch(`${API}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Sub Admin', username: `sub_adm_${Date.now()}`, password: 'password123', role: 'ADMIN' }),
  });
  assert.strictEqual(res.status, 403, 'Standard Admin must not be able to create other ADMIN users');
  assertions++;
  console.log('  ✔ Standard Admin creation restriction verified (403 Forbidden when creating ADMIN)');

  // 2d. Standard Admin creates a MANAGER user -> 201 Created
  res = await fetch(`${API}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Test Manager', username: testManagerUser, password: 'password123', role: 'MANAGER' }),
  });
  assert.strictEqual(res.status, 201, 'Standard Admin must be able to create MANAGER users');
  const managerObj = (await res.json()).data;
  assert.strictEqual(managerObj.role, 'MANAGER');
  assertions += 2;
  console.log('  ✔ Standard Admin created new Manager user successfully');

  // 2e. Register standard Member
  res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Member', username: testMemberUser, password: 'password123' }),
  });
  const memberObj = (await res.json()).data?.user;
  assert(memberObj, 'Member registration failed');
  assertions++;

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
  await fetch(`${API}/admin/users/${managerObj.id}`, {
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
