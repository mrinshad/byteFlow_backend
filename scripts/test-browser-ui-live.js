import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRONTEND_URL = 'http://localhost:3000';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLiveBrowserTest() {
  console.log('================================================================');
  console.log('🎬 LAUNCHING LIVE REAL-TIME BROWSER UI/UX TEST DEMO (CHROME GUI)');
  console.log('================================================================');
  console.log('👀 A visible Google Chrome window will now open on your screen.\n');

  // Launch real Chrome in headed (visible) mode with 400ms slowMo
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    slowMo: 30,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1400,900',
    ],
  });

  const [page] = await browser.pages();
  await page.setViewport({ width: 1380, height: 850 });

  try {
    // -------------------------------------------------------------
    // STEP 1: Landing Page
    // -------------------------------------------------------------
    console.log('📍 [Step 1/8] Opening Landing Page (http://localhost:3000)...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Smooth scroll down to view workflow preview
    console.log('   Scrolling through landing page features...');
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await sleep(1200);
    await page.evaluate(() => window.scrollBy({ top: -400, behavior: 'smooth' }));
    await sleep(800);

    // -------------------------------------------------------------
    // STEP 2: Login Flow
    // -------------------------------------------------------------
    console.log('\n📍 [Step 2/8] Navigating to Sign In page...');
    const loginBtn = await page.$('a[href="/login"]');
    if (loginBtn) {
      await loginBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    }
    await sleep(800);

    console.log('   Entering Super Admin credentials (@byten.in)...');
    await page.type('input[type="text"]', 'byten.in', { delay: 60 });
    await page.type('input[type="password"]', 'byten1234', { delay: 60 });
    await sleep(600);

    console.log('   Submitting login form...');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await sleep(1200);

    // -------------------------------------------------------------
    // STEP 3: Projects Dashboard
    // -------------------------------------------------------------
    console.log('\n📍 [Step 3/8] Exploring Projects Dashboard (/projects)...');
    await page.waitForSelector('h1', { timeout: 5000 });
    await sleep(1200);

    // Click on the first project board to view the Kanban board
    const firstProjectLink = await page.$('.grid a[href^="/projects/"]');
    if (firstProjectLink) {
      console.log('   Opening project Kanban workflow board...');
      await firstProjectLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await sleep(2000);
      console.log('   Kanban board loaded with lanes and cards!');
    }

    // -------------------------------------------------------------
    // STEP 4: Admin Portal & Sidebar Collapsed Tooltips
    // -------------------------------------------------------------
    console.log('\n📍 [Step 4/8] Navigating to Admin Portal (/admin)...');
    await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('aside', { timeout: 5000 });
    await sleep(1000);

    // Hover over collapsed sidebar navigation icons to display tooltips
    console.log('   Hovering over collapsed sidebar icons to demonstrate floating tooltips...');
    const navItems = await page.$$('aside nav a');
    for (let i = 0; i < navItems.length; i++) {
      await navItems[i].hover();
      await sleep(600);
    }

    // Toggle Sidebar Expand
    console.log('   Expanding Admin sidebar to full width (240px)...');
    const toggleBtn = await page.$('aside .group\\/toggle button');
    if (toggleBtn) {
      await toggleBtn.click();
      await sleep(1200);
      console.log('   Collapsing sidebar back to compact mode (68px)...');
      await toggleBtn.click();
      await sleep(800);
    }

    // -------------------------------------------------------------
    // STEP 5: Admin Projects & Filters
    // -------------------------------------------------------------
    console.log('\n📍 [Step 5/8] Inspecting Admin Projects & Filter Controls (/admin/projects)...');
    await page.goto(`${FRONTEND_URL}/admin/projects`, { waitUntil: 'networkidle2' });
    await sleep(1200);

    const showDeletedBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find((b) => b.textContent && (b.textContent.includes('Show Deleted') || b.textContent.includes('Hide Deleted')));
    });
    if (showDeletedBtn) {
      console.log('   Toggling "Show Deleted" filter button...');
      await showDeletedBtn.asElement()?.click();
      await sleep(1500);
      console.log('   Toggling back to active projects only...');
      await showDeletedBtn.asElement()?.click();
      await sleep(800);
    }

    // -------------------------------------------------------------
    // STEP 6: Admin Users Roster & Create User Dialog
    // -------------------------------------------------------------
    console.log('\n📍 [Step 6/8] Inspecting Users Directory & Create User Modal (/admin/users)...');
    await page.goto(`${FRONTEND_URL}/admin/users`, { waitUntil: 'networkidle2' });
    await sleep(1200);

    // Click "Add User" button to open the modal
    console.log('   Clicking "Add User" button...');
    const addUserBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find((b) => b.textContent && b.textContent.includes('Add User'));
    });
    if (addUserBtn) {
      await addUserBtn.asElement()?.click();
      await sleep(1500);

      console.log('   Modal opened: typing demo user information...');
      await page.type('input[placeholder="e.g. Sarah Connor"]', 'Demo Live User', { delay: 40 });
      await sleep(500);
      await page.type('input[placeholder="e.g. sarah_connor"]', 'demo_live', { delay: 40 });
      await sleep(500);

      // Close modal with Cancel
      console.log('   Dismissing modal dialog...');
      const cancelBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('[role="dialog"] button'));
        return buttons.find((b) => b.textContent && b.textContent.includes('Cancel'));
      });
      await cancelBtn.asElement()?.click();
      await sleep(800);
    }

    // -------------------------------------------------------------
    // STEP 7: Workspace Audit Logs Explorer
    // -------------------------------------------------------------
    console.log('\n📍 [Step 7/8] Viewing Workspace Audit Logs (/admin/activities)...');
    await page.goto(`${FRONTEND_URL}/admin/activities`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    // Scroll through table
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
    await sleep(1000);
    await page.evaluate(() => window.scrollBy({ top: -300, behavior: 'smooth' }));
    await sleep(800);

    // -------------------------------------------------------------
    // STEP 8: Roles & Permissions Matrix
    // -------------------------------------------------------------
    console.log('\n📍 [Step 8/8] Viewing Roles & Permissions Matrix (/admin/roles)...');
    await page.goto(`${FRONTEND_URL}/admin/roles`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await sleep(1500);
    await page.evaluate(() => window.scrollBy({ top: -400, behavior: 'smooth' }));
    await sleep(1000);

    console.log('\n================================================================');
    console.log('🎉 LIVE REAL-TIME UI TEST COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');
    await sleep(2000);
  } finally {
    await browser.close();
  }
}

runLiveBrowserTest().catch((err) => {
  console.error('\n❌ Live UI Test Error:', err);
  process.exit(1);
});
