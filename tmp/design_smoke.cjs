const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const outDir = path.join(process.cwd(), 'tmp', 'design-smoke');
  fs.mkdirSync(outDir, { recursive: true });

  const routes = [
    ['home', 'http://127.0.0.1:3000/'],
    ['segunda-fase', 'http://127.0.0.1:3000/segunda-fase'],
    ['confrontos', 'http://127.0.0.1:3000/confrontos'],
    ['mais-escalados', 'http://127.0.0.1:3000/jogadores-mais-escalados'],
    ['admin-login', 'http://127.0.0.1:3000/admin/login'],
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const results = [];

  for (const [name, url] of routes) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 45000 });
      await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
      results.push(`${name}: ok`);
    } catch (error) {
      results.push(`${name}: fail -> ${error.message}`);
    }
  }

  await browser.close();
  console.log(results.join('\n'));
})();
