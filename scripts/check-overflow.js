import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRONTEND_URL = 'http://localhost:3000';

async function checkOverflow() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 1. Login
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="text"]');
  await page.type('input[type="text"]', 'byten.in');
  await page.type('input[type="password"]', 'byten1234');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // 2. Go to projects
  await page.goto(`${FRONTEND_URL}/projects`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('a[href^="/projects/"]');

  // Click first project
  const projectLink = await page.$('a[href^="/projects/"]');
  const projectHref = await page.evaluate((el) => el.getAttribute('href'), projectLink);
  console.log('Navigating to project:', projectHref);
  await page.goto(`${FRONTEND_URL}${projectHref}`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('div[class*="overflow-x-auto"]');

  // Test in Desktop View (1200x800)
  console.log('\n--- DESKTOP VIEW (1200x800) ---');
  await page.setViewport({ width: 1200, height: 800 });
  await new Promise((r) => setTimeout(r, 1000));

  let desktopInfo = await page.evaluate(() => {
    const laneContainer = document.querySelector('div[class*="overflow-x-auto"]');
    const wide = [];
    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > 1201 && (!laneContainer?.contains(el) && el !== laneContainer)) {
        wide.push({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          rectRight: Math.round(rect.right),
          rectLeft: Math.round(rect.left),
          rectWidth: Math.round(rect.width),
          scrollWidth: el.scrollWidth,
        });
      }
    });
    return {
      windowInnerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      wide,
    };
  });
  console.log('Desktop wide elements:', JSON.stringify(desktopInfo, null, 2));

  // Test in Mobile View (375x812)
  console.log('\n--- MOBILE VIEW (375x812) ---');
  await page.setViewport({ width: 375, height: 812 });
  await new Promise((r) => setTimeout(r, 1000));

  info = await page.evaluate(() => {
    const laneContainer = document.querySelector('div[class*="overflow-x-auto"]');
    const outsideProtruding = [];
    document.querySelectorAll('*').forEach((el) => {
      // Check if this element is NOT inside laneContainer and is NOT laneContainer itself
      if (!laneContainer?.contains(el) && el !== laneContainer) {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth + 1 || el.scrollWidth > window.innerWidth + 1) {
          outsideProtruding.push({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            rectRight: Math.round(rect.right),
            rectLeft: Math.round(rect.left),
            rectWidth: Math.round(rect.width),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          });
        }
      }
    });

    return {
      windowInnerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      outsideProtruding,
    };
  });
  console.log('Outside protruding elements:', JSON.stringify(info, null, 2));

  await browser.close();
}

checkOverflow().catch(console.error);
