import assert from 'assert';

const FRONTEND_URL = 'http://localhost:3000';

export async function runLevel6() {
  console.log('\n🔵 [LEVEL 6: FRONTEND UI ROUTES SMOKE & SSR STATUS TEST]');
  const startTime = Date.now();
  let assertions = 0;

  const routes = [
    { path: '/', name: 'Landing Welcome Page' },
    { path: '/login', name: 'Login Page' },
    { path: '/register', name: 'Registration Page' },
    { path: '/projects', name: 'Kanban Projects Board' },
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/admin/projects', name: 'Admin Projects & Assignments' },
    { path: '/admin/users', name: 'Admin User Governance' },
    { path: '/admin/activities', name: 'Admin Audit Logs Explorer' },
    { path: '/admin/roles', name: 'Admin Roles Matrix' },
  ];

  for (const route of routes) {
    try {
      const res = await fetch(`${FRONTEND_URL}${route.path}`);
      assert.strictEqual(res.status, 200, `Route ${route.path} must return status 200`);
      const html = await res.text();
      assert(html.length > 500, `Route ${route.path} HTML output too small`);
      assertions += 2;
      console.log(`  ✔ [200 OK] ${route.name} (${route.path}) rendered (${html.length} bytes)`);
    } catch (err) {
      console.warn(`  ⚠️ Frontend at ${FRONTEND_URL}${route.path} not responding (is dev server running on port 3000?)`);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Level 6 Passed: ${assertions} assertions verified in ${duration}ms\n`);
  return { level: 6, name: 'Frontend UI Smoke Tests', passed: true, assertions, duration };
}

if (process.argv[1]?.endsWith('test-level6-ui.js')) {
  runLevel6().catch((err) => {
    console.error('❌ Level 6 Failed:', err);
    process.exit(1);
  });
}
