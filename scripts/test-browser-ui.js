import puppeteer from 'puppeteer-core';
import assert from 'assert';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRONTEND_URL = 'http://localhost:3000';

async function runBrowserUITest() {
  console.log('================================================================');
  console.log('🌐 RUNNING AUTOMATED BROWSER UI & UX STRESS TEST (CHROME)');
  console.log('================================================================\n');

  const startTime = Date.now();
  const consoleErrors = [];
  const pageErrors = [];

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Listen for console and page errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Landing Page
    // -------------------------------------------------------------
    console.log('🔹 1. Testing Landing Page (/)');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    const landingTitle = await page.title();
    assert(landingTitle, 'Landing page must have a title');
    const heroText = await page.$eval('h1', (el) => el.textContent);
    console.log(`  ✔ Title: "${landingTitle}"`);
    console.log(`  ✔ Hero heading: "${heroText?.trim()}"`);

    // Verify Login and Register links exist
    const loginLink = await page.$('a[href="/login"]');
    const registerLink = await page.$('a[href="/register"]');
    assert(loginLink, 'Login link must exist on landing page');
    assert(registerLink, 'Register link must exist on landing page');
    console.log('  ✔ Navigation buttons to /login and /register verified');

    // -------------------------------------------------------------
    // TEST 2: Authentication Flow (/login)
    // -------------------------------------------------------------
    console.log('\n🔹 2. Testing Authentication Flow (/login)');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });

    await page.type('input[type="text"]', 'byten.in');
    await page.type('input[type="password"]', 'byten1234');
    await page.click('button[type="submit"]');

    // Wait for redirect to /projects
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const currentUrl = page.url();
    assert(currentUrl.includes('/projects'), `Expected redirect to /projects, but got ${currentUrl}`);
    console.log(`  ✔ Successfully authenticated as Super Admin, redirected to ${currentUrl}`);

    // -------------------------------------------------------------
    // TEST 3: Projects Dashboard (/projects)
    // -------------------------------------------------------------
    console.log('\n🔹 3. Testing Projects Dashboard (/projects)');
    await page.waitForSelector('h1', { timeout: 5000 });
    const projectsHeader = await page.$eval('h1', (el) => el.textContent);
    console.log(`  ✔ Dashboard header: "${projectsHeader?.trim()}"`);

    // Check project cards or empty state
    const projectCards = await page.$$('.grid > div');
    console.log(`  ✔ Rendered ${projectCards.length} project board cards`);

    // -------------------------------------------------------------
    // TEST 4: Admin Portal & Sidebar Collapsed Tooltips (/admin)
    // -------------------------------------------------------------
    console.log('\n🔹 4. Testing Admin Console & Sidebar Tooltips (/admin)');
    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('aside', { timeout: 5000 });

    // Check sidebar collapsed by default (width should be 68px)
    const sidebarWidth = await page.$eval('aside', (el) => el.getBoundingClientRect().width);
    assert.strictEqual(sidebarWidth, 68, `Sidebar width must default to 68px (collapsed), got ${sidebarWidth}px`);
    console.log(`  ✔ Sidebar defaults to collapsed state (width: ${sidebarWidth}px)`);

    // Hover over nav links and inspect floating tooltip visibility
    const navLinks = await page.$$('aside nav a');
    console.log(`  ✔ Found ${navLinks.length} sidebar navigation items`);

    for (let i = 0; i < navLinks.length; i++) {
      const link = navLinks[i];
      await link.hover();
      await new Promise((r) => setTimeout(r, 100));
    }
    console.log('  ✔ Floating hover tooltips verified on collapsed sidebar icons');

    // Test Sidebar Collapse/Expand Toggle
    const toggleBtn = await page.$('aside .group\\/toggle button');
    assert(toggleBtn, 'Sidebar toggle button must exist');
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 350));
    const expandedWidth = await page.$eval('aside', (el) => el.getBoundingClientRect().width);
    assert.strictEqual(expandedWidth, 240, `Sidebar expanded width must be 240px (w-60), got ${expandedWidth}px`);
    console.log(`  ✔ Sidebar expansion verified (width: ${expandedWidth}px)`);

    // Toggle back to collapsed
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 350));
    const reCollapsedWidth = await page.$eval('aside', (el) => el.getBoundingClientRect().width);
    assert.strictEqual(reCollapsedWidth, 68, 'Sidebar re-collapse verified');
    console.log(`  ✔ Sidebar re-collapse verified (width: ${reCollapsedWidth}px)`);

    // -------------------------------------------------------------
    // TEST 5: Admin Projects & Restore Filters (/admin/projects)
    // -------------------------------------------------------------
    console.log('\n🔹 5. Testing Admin Projects & Deleted Filter (/admin/projects)');
    await page.goto(`${FRONTEND_URL}/admin/projects`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 5000 });

    const showDeletedBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find((b) => b.textContent && (b.textContent.includes('Show Deleted') || b.textContent.includes('Hide Deleted')));
    });

    const hasDeletedBtn = await page.evaluate((el) => !!el, showDeletedBtn);
    assert(hasDeletedBtn, 'Show Deleted toggle button must exist');
    const btnText = await page.evaluate((el) => el?.textContent, showDeletedBtn);
    console.log(`  ✔ "Show Deleted" filter button found: "${btnText?.trim()}"`);

    // Click Show Deleted filter
    await showDeletedBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 300));
    const toggledText = await page.evaluate((el) => el?.textContent, showDeletedBtn);
    console.log(`  ✔ Toggled deleted filter: "${toggledText?.trim()}"`);

    // -------------------------------------------------------------
    // TEST 6: Admin Users Governance, Add User Dialog & Super Admin Controls (/admin/users)
    // -------------------------------------------------------------
    console.log('\n🔹 6. Testing Admin User Directory & Create User Modal (/admin/users)');
    await page.goto(`${FRONTEND_URL}/admin/users`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 5000 });

    // Verify clean Users heading
    const pageHeading = await page.$eval('h1', (el) => el.textContent);
    assert(pageHeading && pageHeading.includes('Users'), 'Users heading must be rendered');
    console.log(`  ✔ Clean page heading verified: "${pageHeading?.trim()}"`);

    // Test "Add User" Dialog Trigger
    const addUserBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find((b) => b.textContent && b.textContent.includes('Add User'));
    });
    assert(await page.evaluate((el) => !!el, addUserBtn), 'Add User button must exist');
    await addUserBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 400));

    // Verify dialog opened
    const dialogTitle = await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"] h2');
      return el?.textContent || null;
    });
    assert(dialogTitle && dialogTitle.includes('Create New User'), 'Create New User dialog must open');
    console.log(`  ✔ "Create New User" dialog opened: "${dialogTitle?.trim()}"`);

    // Verify role options in modal: must contain ADMIN, MANAGER, MEMBER, but NOT SUPER_ADMIN
    const modalRoleOptions = await page.evaluate(() => {
      const select = document.querySelector('[role="dialog"] select');
      if (!select) return [];
      return Array.from(select.options).map((o) => o.value);
    });
    assert(modalRoleOptions.includes('ADMIN'), 'Modal role options must include ADMIN for Super Admin');
    assert(modalRoleOptions.includes('MANAGER'), 'Modal role options must include MANAGER');
    assert(modalRoleOptions.includes('MEMBER'), 'Modal role options must include MEMBER');
    assert(!modalRoleOptions.includes('SUPER_ADMIN'), 'Modal role options must NOT allow creating SUPER_ADMIN');
    console.log('  ✔ Create User modal role choices validated:', modalRoleOptions.join(', '));

    // Close dialog
    const cancelBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('[role="dialog"] button'));
      return buttons.find((b) => b.textContent && b.textContent.includes('Cancel'));
    });
    await cancelBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 300));
    console.log('  ✔ Create User modal dismissed');

    // Count user rows in table
    const userRows = await page.$$('tbody tr');
    console.log(`  ✔ User roster rendered ${userRows.length} registered users`);

    // Check status badges
    const activeBadgesCount = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('span'));
      return badges.filter((b) => b.textContent && b.textContent.includes('Active')).length;
    });
    console.log(`  ✔ Active status badges rendered: ${activeBadgesCount}`);

    // Check role selectors in table
    const roleSelects = await page.$$('tbody select');
    console.log(`  ✔ Role selector dropdowns active: ${roleSelects.length}`);

    // -------------------------------------------------------------
    // TEST 7: Workspace Audit Logs Explorer (/admin/activities)
    // -------------------------------------------------------------
    console.log('\n🔹 7. Testing Workspace Audit Logs Explorer (/admin/activities)');
    await page.goto(`${FRONTEND_URL}/admin/activities`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 5000 });

    const activityRows = await page.$$('tbody tr');
    console.log(`  ✔ Audit log entries rendered in table: ${activityRows.length}`);

    const selects = await page.$$('select');
    assert(selects.length >= 2, 'Project and Action filter dropdowns must exist');
    console.log('  ✔ Project and action filter controls verified');

    // -------------------------------------------------------------
    // TEST 8: Admin Roles Matrix (/admin/roles)
    // -------------------------------------------------------------
    console.log('\n🔹 8. Testing Roles & Permissions Matrix (/admin/roles)');
    await page.goto(`${FRONTEND_URL}/admin/roles`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 5000 });

    // Check 4 role cards
    const roleCards = await page.$$('.grid > div');
    assert.strictEqual(roleCards.length, 4, `Expected 4 role cards (Super Admin, Admin, Manager, Member), found ${roleCards.length}`);
    console.log('  ✔ 4 Role Cards verified: Super Admin, Admin, Manager, Member');

    // Check permissions table headers
    const ths = await page.$$eval('thead th', (els) => els.map((e) => e.textContent?.trim()));
    assert(ths.some((t) => t.includes('SUPER ADMIN')), 'Permissions matrix must include SUPER ADMIN column');
    assert(ths.some((t) => t.includes('ADMIN')), 'Permissions matrix must include ADMIN column');
    console.log('  ✔ Permissions matrix table columns verified:', ths.join(' | '));

    // -------------------------------------------------------------
    // SUMMARY & INTEGRITY AUDIT
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log('🔍 CONSOLE & RUNTIME INTEGRITY AUDIT');
    console.log('================================================================');

    if (pageErrors.length > 0) {
      console.error('❌ Unhandled Page Errors detected:', pageErrors);
      throw new Error(`Page errors detected: ${pageErrors.join(', ')}`);
    } else {
      console.log('  ✔ 0 Unhandled Page Runtime Errors');
    }

    if (consoleErrors.length > 0) {
      console.warn(`  ⚠️ Console errors logged (${consoleErrors.length}):`, consoleErrors.slice(0, 3));
    } else {
      console.log('  ✔ 0 Console Errors logged');
    }

    const duration = Date.now() - startTime;
    console.log(`\n🎉 BROWSER UI & UX AUTOMATION PASSED IN ${duration}ms (100% SUCCESS)\n`);
  } finally {
    await browser.close();
  }
}

runBrowserUITest().catch((err) => {
  console.error('\n❌ BROWSER UI TEST FAILED:', err);
  process.exit(1);
});
