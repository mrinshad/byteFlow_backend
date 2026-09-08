import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRONTEND_URL = 'http://localhost:3000';
const BENCHMARK_PROJECT_ID = '5a522081-4e2b-4b59-8d50-2976ad7be768';
const OUTPUT_FILE = '/Users/apple/.gemini/antigravity-ide/brain/6d50d97a-37e9-47b3-a280-ec8a4fc614bd/scratch/frontend-audit-metrics.json';

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function getCDPMetrics(client) {
  const perfMetrics = await client.send('Performance.getMetrics');
  const metricsMap = {};
  for (const m of perfMetrics.metrics) {
    metricsMap[m.name] = m.value;
  }
  return metricsMap;
}

async function forceGC(client) {
  await client.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 200));
  await client.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 200));
}

async function runAudit() {
  console.log('🚀 Starting Deep Frontend Performance & Memory Management Audit...');
  console.log('👀 Browser launched with headless: false for full visual execution visibility.');

  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      nextVersion: '16.2.6',
      reactVersion: '19.2.4',
      tailwindVersion: 'v4',
      url: FRONTEND_URL,
      benchmarkProject: BENCHMARK_PROJECT_ID,
    },
    baseline: {},
    drawerStressTest: {},
    routeChurnTest: {},
    scrollAndFramerateTest: {},
    longTasks: [],
    layoutShifts: [],
    responsiveMetrics: {},
  };

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--js-flags=--expose-gc',
      '--window-size=1360,920',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const client = await page.target().createCDPSession();
  await client.send('Performance.enable');

  try {
    // 1. Login
    console.log('🔹 1. Authenticating as superadmin...');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="text"]', { timeout: 8000 });
    await page.type('input[type="text"]', 'byten.in');
    await page.type('input[type="password"]', 'byten1234');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✔ Authenticated successfully. Current URL:', page.url());

    // 2. Navigate to Benchmark Kanban Board
    console.log('🔹 2. Navigating to Benchmark Kanban Board...');
    const boardUrl = `${FRONTEND_URL}/projects/${BENCHMARK_PROJECT_ID}`;
    await page.goto(boardUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-role="lane-column"]', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000)); // allow initial render to settle

    // Force GC to get clean baseline
    await forceGC(client);
    let cdpMetrics = await getCDPMetrics(client);
    const domNodeCount = await page.evaluate(() => document.getElementsByTagName('*').length);

    results.baseline = {
      usedJSHeapSize: formatBytes(cdpMetrics.JSHeapUsedSize),
      usedJSHeapSizeBytes: cdpMetrics.JSHeapUsedSize,
      totalJSHeapSize: formatBytes(cdpMetrics.JSHeapTotalSize),
      totalJSHeapSizeBytes: cdpMetrics.JSHeapTotalSize,
      domNodes: domNodeCount,
      cdpNodes: cdpMetrics.Nodes,
      jsEventListeners: cdpMetrics.JSEventListeners,
      documents: cdpMetrics.Documents,
      frames: cdpMetrics.Frames,
    };
    console.log('📊 Baseline Metrics:', results.baseline);

    // Set up PerformanceObserver for LongTasks and Layout Shifts
    await page.evaluate(() => {
      window.__longTasks = [];
      window.__layoutShifts = [];
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__longTasks.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('LongTask observer error:', e);
      }

      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__layoutShifts.push({
                value: entry.value,
                startTime: entry.startTime,
              });
            }
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('LayoutShift observer error:', e);
      }
    });

    // 3. Card Detail Drawer Stress Test (12 cycles)
    console.log('🔹 3. Running Card Detail Drawer Open/Close Stress Test (12 cycles)...');
    const drawerCycles = [];
    for (let cycle = 1; cycle <= 12; cycle++) {
      // Find card on the board
      const cardHandle = await page.$('[data-role="card-item"]');
      if (!cardHandle) {
        console.warn('Card handle not found on cycle', cycle);
        break;
      }
      
      // Click card to open drawer
      await cardHandle.click();
      await page.waitForSelector('[data-role="close-card-drawer"]', { timeout: 6000 });
      await new Promise(r => setTimeout(r, 200));

      // Close drawer via close button
      const closeBtn = await page.$('[data-role="close-card-drawer"]');
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForFunction(() => !document.querySelector('[data-role="close-card-drawer"]'), { timeout: 6000 });
      await new Promise(r => setTimeout(r, 200));

      if (cycle % 3 === 0 || cycle === 12) {
        const intermediateMetrics = await getCDPMetrics(client);
        drawerCycles.push({
          cycle,
          usedJSHeapSize: formatBytes(intermediateMetrics.JSHeapUsedSize),
          usedJSHeapSizeBytes: intermediateMetrics.JSHeapUsedSize,
          domNodes: await page.evaluate(() => document.getElementsByTagName('*').length),
          jsEventListeners: intermediateMetrics.JSEventListeners,
        });
        console.log(`   Cycle ${cycle}/12: Heap=${formatBytes(intermediateMetrics.JSHeapUsedSize)}, Nodes=${intermediateMetrics.Nodes}, Listeners=${intermediateMetrics.JSEventListeners}`);
      }
    }

    // Post-drawer forced GC
    await forceGC(client);
    const postDrawerMetrics = await getCDPMetrics(client);
    const postDrawerDomNodes = await page.evaluate(() => document.getElementsByTagName('*').length);

    results.drawerStressTest = {
      cyclesSampled: drawerCycles,
      postGCUsedHeap: formatBytes(postDrawerMetrics.JSHeapUsedSize),
      postGCUsedHeapBytes: postDrawerMetrics.JSHeapUsedSize,
      postGCDOMNodes: postDrawerDomNodes,
      postGCCdpNodes: postDrawerMetrics.Nodes,
      postGCEventListeners: postDrawerMetrics.JSEventListeners,
      retainedHeapDelta: formatBytes(Math.max(0, postDrawerMetrics.JSHeapUsedSize - results.baseline.usedJSHeapSizeBytes)),
      retainedHeapDeltaBytes: postDrawerMetrics.JSHeapUsedSize - results.baseline.usedJSHeapSizeBytes,
      domNodeLeakDelta: postDrawerDomNodes - results.baseline.domNodes,
      listenerLeakDelta: postDrawerMetrics.JSEventListeners - results.baseline.jsEventListeners,
    };
    console.log('📊 Drawer Stress Test Summary:', results.drawerStressTest);

    // 4. Scroll & Frame Rate Profiling
    console.log('🔹 4. Profiling Horizontal & Vertical Scroll Frame Rate (FPS)...');
    const scrollFpsResult = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const frameTimes = [];
        let lastTime = performance.now();
        let frameCount = 0;
        let isRunning = true;

        function onFrame(currentTime) {
          const delta = currentTime - lastTime;
          frameTimes.push(delta);
          lastTime = currentTime;
          frameCount++;
          if (isRunning) {
            requestAnimationFrame(onFrame);
          }
        }

        const animId = requestAnimationFrame(onFrame);

        // Perform automated scrolling
        const container = document.querySelector('[data-role="lanes-container"]') || 
                          document.querySelector('main') || 
                          document.documentElement;

        let scrollCount = 0;
        const interval = setInterval(() => {
          if (container) {
            container.scrollLeft = (scrollCount % 2 === 0) ? 600 : 0;
            window.scrollBy(0, (scrollCount % 2 === 0) ? 300 : -300);
          }
          scrollCount++;
          if (scrollCount >= 10) {
            clearInterval(interval);
            isRunning = false;
            cancelAnimationFrame(animId);

            // Compute statistics
            const durations = frameTimes.slice(2); // drop initial frame
            const totalDuration = durations.reduce((a, b) => a + b, 0);
            const avgFps = durations.length / (totalDuration / 1000);
            const jankFrames = durations.filter(d => d > 24); // > 24ms (~ <41fps)
            const severeJankFrames = durations.filter(d => d > 50); // > 50ms drops
            const maxFrameTime = Math.max(...durations);

            resolve({
              avgFps: Math.round(avgFps * 10) / 10,
              totalFramesSampled: durations.length,
              jankFramesCount: jankFrames.length,
              severeJankCount: severeJankFrames.length,
              jankRatio: `${((jankFrames.length / durations.length) * 100).toFixed(1)}%`,
              maxFrameTimeMs: Math.round(maxFrameTime * 10) / 10,
            });
          }
        }, 120);
      });
    });

    results.scrollAndFramerateTest = scrollFpsResult;
    console.log('📊 Scroll & FPS Results:', scrollFpsResult);

    // 5. Route Churn & Component Unmount Leak Test (5 cycles)
    console.log('🔹 5. Running Route Churn Test (Kanban <-> Projects List x5)...');
    const routeCycles = [];
    for (let r = 1; r <= 5; r++) {
      // Go to /projects
      await page.goto(`${FRONTEND_URL}/projects`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('table, [class*="grid"], a[href*="/projects/"]', { timeout: 8000 });
      await new Promise(res => setTimeout(res, 400));

      // Go back to board
      await page.goto(boardUrl, { waitUntil: 'networkidle2' });
      await page.waitForSelector('[data-role="lane-column"], [class*="lane"]', { timeout: 8000 });
      await new Promise(res => setTimeout(res, 400));

      const rMetrics = await getCDPMetrics(client);
      routeCycles.push({
        iteration: r,
        usedJSHeap: formatBytes(rMetrics.JSHeapUsedSize),
        listeners: rMetrics.JSEventListeners,
      });
    }

    // Force GC after route churn
    await forceGC(client);
    const postRouteMetrics = await getCDPMetrics(client);
    const postRouteDomNodes = await page.evaluate(() => document.getElementsByTagName('*').length);

    results.routeChurnTest = {
      iterations: routeCycles,
      postGCUsedHeap: formatBytes(postRouteMetrics.JSHeapUsedSize),
      postGCUsedHeapBytes: postRouteMetrics.JSHeapUsedSize,
      postGCDOMNodes: postRouteDomNodes,
      postGCEventListeners: postRouteMetrics.JSEventListeners,
      retainedHeapDelta: formatBytes(Math.max(0, postRouteMetrics.JSHeapUsedSize - results.baseline.usedJSHeapSizeBytes)),
      retainedHeapDeltaBytes: postRouteMetrics.JSHeapUsedSize - results.baseline.usedJSHeapSizeBytes,
      listenerLeakDelta: postRouteMetrics.JSEventListeners - results.baseline.jsEventListeners,
    };
    console.log('📊 Route Churn Summary:', results.routeChurnTest);

    // 6. Harvest Long Tasks & Layout Shifts
    const perfEntries = await page.evaluate(() => ({
      longTasks: window.__longTasks || [],
      layoutShifts: window.__layoutShifts || [],
    }));

    results.longTasks = perfEntries.longTasks.slice(0, 15);
    results.layoutShifts = perfEntries.layoutShifts.slice(0, 15);
    const totalCls = perfEntries.layoutShifts.reduce((sum, s) => sum + s.value, 0);
    results.cumulativeLayoutShift = Math.round(totalCls * 1000) / 1000;
    console.log(`📊 Total Cumulative Layout Shift (CLS): ${results.cumulativeLayoutShift}`);
    console.log(`📊 Long Tasks Count (>50ms): ${perfEntries.longTasks.length}`);

    // 7. Mobile Viewport & Table Card Layout Verification
    console.log('🔹 7. Testing Mobile Viewport (390x844) & Responsive UI/UX...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${FRONTEND_URL}/projects`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Check if table renders cards on mobile
    const mobileTableChecks = await page.evaluate(() => {
      const table = document.querySelector('table');
      const tableVisible = table ? window.getComputedStyle(table).display !== 'none' : false;
      const cardViewElements = document.querySelectorAll('[class*="rounded-lg border"], [class*="card"]');
      return {
        tableHiddenOrAdapted: !tableVisible || table === null,
        cardsRendered: cardViewElements.length,
      };
    });

    results.responsiveMetrics = {
      viewport: '390x844 (Mobile)',
      mobileTableResponsiveCards: mobileTableChecks,
    };
    console.log('📊 Responsive Checks:', results.responsiveMetrics);

    // Save final metrics to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    console.log('✅ In-depth Memory & Performance Audit Completed. Metrics saved to:', OUTPUT_FILE);

  } finally {
    await browser.close();
  }
}

runAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
