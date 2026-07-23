#!/usr/bin/env node

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { get as httpsGet } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { basename, extname, normalize, resolve, sep } from 'node:path';
import readline from 'node:readline';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const assetDir = resolve(args.get('--assets') || '.');
const modulePath = args.get('--playwright-module') || 'playwright';
const localFontPath = args.get('--font') || process.env.EVA_TITLE_FONT_PATH || `${process.env.HOME || ''}/Library/Fonts/EVA-Matisse_Classic.ttf`;
const require = createRequire(import.meta.url);
const { chromium } = require(modulePath);
const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
const pendingLines = [];
input.on('line', (line) => pendingLines.push(line));

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function writeResult(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function fetchFontSubset(query) {
  return new Promise((resolveFetch, rejectFetch) => {
    const request = httpsGet(`https://lab.magiconch.com/api/fontmin?${query}`, (response) => {
      if ((response.statusCode || 500) >= 400) {
        rejectFetch(new Error(`font subset request failed with ${response.statusCode}`));
        response.resume();
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolveFetch({
        body: Buffer.concat(chunks),
        contentType: response.headers['content-type'] || 'font/woff',
      }));
    });
    request.setTimeout(20_000, () => request.destroy(new Error('font subset request timed out')));
    request.on('error', rejectFetch);
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/api/fontmin') {
      const font = await fetchFontSubset(url.searchParams.toString());
      response.writeHead(200, { 'content-type': font.contentType, 'content-length': font.body.length });
      response.end(font.body);
      return;
    }
    if (url.pathname === '/local-eva-matisse.ttf') {
      const fontStat = await stat(localFontPath);
      if (!fontStat.isFile()) throw new Error('Local EVA font is unavailable');
      response.writeHead(200, { 'content-type': 'font/ttf', 'content-length': fontStat.size });
      createReadStream(localFontPath).pipe(response);
      return;
    }
    const requested = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    const filePath = resolve(assetDir, normalize(requested));
    if (!filePath.startsWith(`${assetDir}${sep}`) && filePath !== assetDir) {
      response.writeHead(403).end();
      return;
    }
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
process.stderr.write(`[eva-renderer] static server ready on ${port}\n`);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
process.stderr.write('[eva-renderer] browser ready\n');
const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
const page = await context.newPage();
await page.goto(`http://127.0.0.1:${port}/?layout=e1`, { waitUntil: 'domcontentloaded' });
process.stderr.write('[eva-renderer] page DOM ready\n');
await page.waitForSelector('input');
await waitForOutput();
process.stderr.write('[eva-renderer] page ready\n');

let currentLayout = 'e1';

async function waitForOutput() {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('section.output-box canvas');
    if (!(canvas instanceof HTMLCanvasElement) || canvas.width < 600 || canvas.height < 400) return false;
    return canvas.getContext('2d')?.getImageData(0, 0, 1, 1).data[3] > 0;
  }, { timeout: 20_000 });
}

async function openLayout(layout) {
  if (layout === currentLayout) return;
  await page.goto(`http://127.0.0.1:${port}/?layout=${encodeURIComponent(layout)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input');
  await waitForOutput();
  currentLayout = layout;
}

async function render(request) {
  const layout = typeof request.layout === 'string' && request.layout ? request.layout : 'e1';
  await openLayout(layout);

  const { texts } = request;
  if (texts !== undefined && (!Array.isArray(texts) || !texts.every((item) => typeof item === 'string'))) {
    throw new Error('texts must be an array of strings');
  }

  if (texts !== undefined) {
    const inputs = page.locator('input[type="text"]');
    const inputCount = await inputs.count();
    if (texts.length !== inputCount) {
      throw new Error(`layout ${layout} requires ${inputCount} text values, received ${texts.length}`);
    }
    for (let index = 0; index < inputCount; index += 1) {
      await inputs.nth(index).fill(texts[index]);
    }
    await inputs.nth(inputCount - 1).press('Tab');
    await page.getByRole('button', { name: '生成' }).click();
    // Upstream make() applies a 200ms debounce before switching the loading state.
    await page.waitForTimeout(300);
    await waitForOutput();
  }
  await page.locator('section.output-box canvas').screenshot({ path: request.outputPath, type: 'png' });
  return { outputPath: request.outputPath, layout };
}

let queue = Promise.resolve();
function enqueue(line) {
  queue = queue.then(async () => {
    let request;
    try {
      request = JSON.parse(line);
      const result = await render(request);
      writeResult({ id: request.id, ok: true, ...result });
    } catch (error) {
      writeResult({ id: request?.id || '', ok: false, error: `${error.name}: ${error.message}` });
    }
  });
}

input.removeAllListeners('line');
for (const line of pendingLines) enqueue(line);
input.on('line', enqueue);
writeResult({ type: 'ready', ok: true });

async function shutdown() {
  input.close();
  await context.close();
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
