#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const svgPath = join(repoRoot, 'public', 'icon.svg');
const svg = readFileSync(svgPath, 'utf8');

const sizes = [192, 512];

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  for (const size of sizes) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    const html = `<!doctype html><html><head><style>
      html,body { margin:0; padding:0; background:transparent; }
      svg { width:${size}px; height:${size}px; display:block; }
    </style></head><body>${svg}</body></html>`;
    await page.setContent(html, { waitUntil: 'load' });
    const out = join(repoRoot, 'public', `icon-${size}.png`);
    const buf = await page.screenshot({
      type: 'png',
      omitBackground: false,
      clip: { x: 0, y: 0, width: size, height: size },
    });
    writeFileSync(out, buf);
    console.log(`wrote ${out} (${buf.length} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
}
