#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

const sleep = promisify(setTimeout);

async function testDrawer() {
  console.log('Starting preview server...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Wait for server to start
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('localhost')) {
        console.log('Server ready');
        resolve();
      }
    });
  });

  await sleep(2000); // Extra buffer

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE size

    console.log('Loading page...');
    await page.goto('http://localhost:4173/walking-windeck/', {
      waitUntil: 'networkidle0',
    });

    await sleep(1000);

    // Find and click the hamburger button
    console.log('Looking for hamburger button...');
    const hamburgerButton = await page.$(
      'button[aria-label="Menu"], button:has(svg line[x1="3"][y1="12"])'
    );

    if (!hamburgerButton) {
      throw new Error('Hamburger button not found');
    }

    console.log('Clicking hamburger button...');
    await hamburgerButton.click();

    // Wait for drawer animation
    await sleep(500);

    // Check that drawer is visible
    console.log('Checking drawer visibility...');

    // Method 1: Check backdrop exists and is visible
    const backdrop = await page.evaluate(() => {
      const el = document.querySelector('.fixed.inset-0.bg-black\\/80');
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        exists: true,
        width: rect.width,
        height: rect.height,
        opacity: style.opacity,
        zIndex: style.zIndex,
      };
    });

    console.log('Backdrop:', backdrop);

    if (!backdrop || !backdrop.exists) {
      throw new Error('Backdrop element not found');
    }

    if (backdrop.width === 0 || backdrop.height === 0) {
      throw new Error('Backdrop has zero dimensions');
    }

    if (parseFloat(backdrop.opacity) < 0.1) {
      throw new Error('Backdrop is transparent (opacity too low)');
    }

    if (parseInt(backdrop.zIndex) < 999) {
      throw new Error(`Backdrop z-index too low: ${backdrop.zIndex}`);
    }

    // Method 2: Check drawer panel
    const drawer = await page.evaluate(() => {
      const el = document.querySelector('.fixed.inset-y-0.left-0');
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        exists: true,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        transform: style.transform,
        zIndex: style.zIndex,
      };
    });

    console.log('Drawer panel:', drawer);

    if (!drawer || !drawer.exists) {
      throw new Error('Drawer panel not found');
    }

    if (drawer.width === 0) {
      throw new Error('Drawer panel has zero width');
    }

    if (drawer.left < -50) {
      throw new Error(`Drawer panel is off-screen (left: ${drawer.left})`);
    }

    if (drawer.transform !== 'none' && !drawer.transform.includes('matrix(1, 0, 0, 1, 0, 0)')) {
      throw new Error(`Drawer panel has unexpected transform: ${drawer.transform}`);
    }

    if (parseInt(drawer.zIndex) < 1000) {
      throw new Error(`Drawer panel z-index too low: ${drawer.zIndex}`);
    }

    // Method 3: Check that drawer content is visible
    const content = await page.evaluate(() => {
      const title = document.querySelector('h2');
      if (!title || !title.textContent?.includes('WalkingWindeck')) return null;

      const rect = title.getBoundingClientRect();
      return {
        exists: true,
        visible: rect.width > 0 && rect.height > 0 && rect.left >= 0,
        text: title.textContent,
      };
    });

    console.log('Drawer content:', content);

    if (!content || !content.exists) {
      throw new Error('Drawer content (title) not found');
    }

    if (!content.visible) {
      throw new Error('Drawer content is not visible');
    }

    console.log('\n✅ TEST PASSED: Drawer renders and is fully visible');
    console.log(`   - Backdrop: ${backdrop.width}x${backdrop.height}, z-index ${backdrop.zIndex}`);
    console.log(
      `   - Panel: ${drawer.width}px wide, left: ${drawer.left}, z-index ${drawer.zIndex}`
    );
    console.log(`   - Content: "${content.text}" is visible`);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    throw error;
  } finally {
    await browser.close();
    server.kill();
  }
}

testDrawer().catch((err) => {
  console.error(err);
  process.exit(1);
});
