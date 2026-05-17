import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}/matshikes/`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name, description) {
  console.log(`Taking screenshot: ${name} - ${description}`);
  await sleep(300);
  await page.screenshot({ path: `${name}.png`, fullPage: false });
  console.log(`  ✓ Saved ${name}.png`);
}

async function main() {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      executablePath: '/snap/bin/chromium',
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      headless: 'new',
    });

    const page = await browser.newPage();

    // Set mobile viewport (iPhone 14)
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    // Inject geolocation stub before navigation
    await page.evaluateOnNewDocument(() => {
      const fakePos = {
        coords: {
          latitude: 50.8137,
          longitude: 7.5789,
          accuracy: 5,
          altitude: 220,
          altitudeAccuracy: 5,
          heading: null,
          speed: 1,
        },
        timestamp: Date.now(),
      };

      navigator.geolocation.getCurrentPosition = (success) => {
        setTimeout(() => success(fakePos), 100);
      };

      navigator.geolocation.watchPosition = (success) => {
        success(fakePos);
        const interval = setInterval(() => {
          success({
            ...fakePos,
            timestamp: Date.now(),
          });
        }, 1000);
        return interval;
      };

      navigator.geolocation.clearWatch = () => {};
    });

    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait for map to load
    console.log('Waiting for map to load...');
    await sleep(3000);

    // Screenshot 1: Map idle
    await takeScreenshot(page, '01-map-idle', 'Fresh load with map and FABs visible');

    // Find and click the hamburger menu button
    console.log('Looking for menu button...');

    // Try multiple selectors for the hamburger menu
    let menuButton = await page.$('button[aria-label*="menu" i]');
    if (!menuButton) {
      menuButton = await page.$('button[aria-label*="open" i]');
    }
    if (!menuButton) {
      // Look for a button in the bottom-left area with an icon
      menuButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        // Find button with menu/hamburger icon (often has three bars)
        const menuBtn = buttons.find((btn) => {
          const rect = btn.getBoundingClientRect();
          // Bottom-left quadrant
          return rect.left < 200 && rect.top > 600;
        });
        return menuBtn;
      });

      if (menuButton) {
        menuButton = await page.$('button'); // Get first button for now
      }
    }

    if (!menuButton) {
      // Last resort: find all buttons and log them
      const buttons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map((btn) => ({
          text: btn.textContent,
          aria: btn.getAttribute('aria-label'),
          classes: btn.className,
        }));
      });
      console.log('Available buttons:', JSON.stringify(buttons, null, 2));

      // Try to find by position
      const coords = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const rect = btn.getBoundingClientRect();
          if (rect.left < 100 && rect.top > 700) {
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          }
        }
        return null;
      });

      if (coords) {
        console.log(`Clicking at coordinates: ${coords.x}, ${coords.y}`);
        await page.mouse.click(coords.x, coords.y);
      } else {
        throw new Error('Could not find menu button');
      }
    } else {
      await menuButton.click();
    }

    await sleep(500); // Wait for drawer animation

    // Screenshot 2: Drawer idle
    await takeScreenshot(page, '02-drawer-idle', 'Drawer open with Start tracking and nav links');

    // Look for "Start tracking" button or link
    console.log('Looking for Start tracking button...');
    const startButton = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a'));
      const startBtn = elements.find(
        (el) =>
          el.textContent.toLowerCase().includes('start') &&
          el.textContent.toLowerCase().includes('track')
      );
      return startBtn !== undefined;
    });

    if (!startButton) {
      console.log('Could not find Start tracking button, trying alternative approach...');
    }

    // Click Start tracking
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a'));
      const startBtn = elements.find(
        (el) =>
          el.textContent.toLowerCase().includes('start') &&
          el.textContent.toLowerCase().includes('track')
      );
      if (startBtn) startBtn.click();
    });

    await sleep(500); // Wait for drawer to close

    // Wait for tracking to start and accumulate some points
    console.log('Waiting for tracking to start...');
    await sleep(4000);

    // Screenshot 3: Drawer recording
    await takeScreenshot(
      page,
      '03-drawer-recording',
      'Map with active tracking, pulsing red ring on FAB'
    );

    // Open drawer again
    console.log('Opening drawer while tracking...');
    const coords = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        if (rect.left < 100 && rect.top > 700) {
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
      return null;
    });

    if (coords) {
      await page.mouse.click(coords.x, coords.y);
    }

    await sleep(500);

    // Screenshot 4: Drawer tracking actions
    await takeScreenshot(
      page,
      '04-drawer-tracking-actions',
      'Drawer with live stats, Pause and Stop buttons'
    );

    // Click Stop button
    console.log('Clicking Stop button...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button'));
      const stopBtn = elements.find((el) => el.textContent.toLowerCase().includes('stop'));
      if (stopBtn) stopBtn.click();
    });

    await sleep(500);

    // Screenshot 5: Stop dialog
    await takeScreenshot(page, '05-stop-dialog', 'Save dialog with pre-filled name input');

    console.log('\n✅ All screenshots captured successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);

    if (browser) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
          await pages[0].screenshot({ path: '99-error.png' });
          console.log('Saved error screenshot: 99-error.png');
        }
      } catch (e) {
        console.error('Could not save error screenshot:', e);
      }
    }

    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
