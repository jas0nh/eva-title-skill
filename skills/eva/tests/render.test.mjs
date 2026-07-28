import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { LAYOUTS, toTraditional } from '../scripts/renderer.mjs';

const cli = new URL('../scripts/render-eva-title.mjs', import.meta.url).pathname;
const font = join(process.env.HOME, 'Library', 'Fonts', 'FOT-Matisse Pro EB.otf');
const work = join(tmpdir(), `eva-skill-test-${process.pid}`);
const sample = ['测', '试', '标题'];
const e24BrowserReference = new URL('./fixtures/e24-browser.png', import.meta.url).pathname;

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

test('renders every declared vendor layout as a 640x480 PNG', () => {
  for (const [layout, count] of Object.entries(LAYOUTS)) {
    const output = join(work, `${layout}.png`);
    const result = run(['--layout', layout, '--texts', JSON.stringify(sample.slice(0, count)), '--output', output, '--font', font]);
    assert.equal(result.status, 0, `${layout}: ${result.stderr}`);
    assert.equal(existsSync(output), true, layout);
    const png = readFileSync(output);
    assert.equal(png.subarray(1, 4).toString(), 'PNG', layout);
    assert.equal(png.readUInt32BE(16), 640, layout);
    assert.equal(png.readUInt32BE(20), 480, layout);
    assert.ok(png.length > 1000, layout);
  }
  rmSync(work, { recursive: true, force: true });
});

test('rejects unsupported layouts and mismatched slots', () => {
  const unknown = run(['--layout', 'unknown', '--texts', '["测试"]', '--output', join(work, 'bad.png'), '--font', font]);
  const slots = run(['--layout', 'e24', '--texts', '["测","试"]', '--output', join(work, 'bad.png'), '--font', font]);
  const nonString = run(['--layout', 'e24', '--texts', '[1]', '--output', join(work, 'bad.png'), '--font', font]);
  assert.equal(unknown.status, 64);
  assert.equal(slots.status, 64);
  assert.equal(nonString.status, 64);
});

test('fails clearly for a missing font and an invalid output directory', () => {
  const missingFont = run(['--layout', 'e24', '--texts', '["测试"]', '--output', join(work, 'font.png'), '--font', join(work, 'missing.otf')]);
  const outputFile = join(work, 'not-a-directory');
  mkdirSync(work, { recursive: true });
  writeFileSync(outputFile, 'not a directory');
  const invalidOutput = run(['--layout', 'e24', '--texts', '["测试"]', '--output', join(outputFile, 'nested.png'), '--font', font]);
  assert.equal(missingFont.status, 1);
  assert.match(missingFont.stderr, /font is unavailable/);
  assert.equal(invalidOutput.status, 1);
});

test('renders deterministically with a non-background text region', () => {
  const first = join(work, 'deterministic-1.png');
  const second = join(work, 'deterministic-2.png');
  assert.equal(run(['--layout', 'e24', '--texts', '["测试"]', '--output', first, '--font', font]).status, 0);
  assert.equal(run(['--layout', 'e24', '--texts', '["测试"]', '--output', second, '--font', font]).status, 0);
  assert.deepEqual(readFileSync(first), readFileSync(second));
  assert.ok(readFileSync(first).length > 10_000);
});

test('uses the upstream simplified-to-traditional transform before glyph fallback', () => {
  assert.equal(toTraditional('测试'), '測試');
});

async function darkPixelStats(path) {
  const image = await loadImage(path);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  let left = image.width;
  let top = image.height;
  let right = 0;
  let bottom = 0;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
    if (luminance >= 80) continue;
    const pixel = index / 4;
    const x = pixel % image.width;
    const y = Math.floor(pixel / image.width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + 1);
    bottom = Math.max(bottom, y + 1);
    count += 1;
  }
  return { width: image.width, height: image.height, bbox: [left, top, right, bottom], count };
}

test('e24 geometry matches the original browser Canvas reference', async () => {
  const output = join(work, 'e24-vendor-regression.png');
  assert.equal(run(['--layout', 'e24', '--texts', '["测试"]', '--output', output, '--font', font]).status, 0);
  const actual = await darkPixelStats(output);
  const reference = await darkPixelStats(e24BrowserReference);
  assert.deepEqual([actual.width, actual.height], [reference.width, reference.height]);
  actual.bbox.forEach((value, index) => assert.ok(Math.abs(value - reference.bbox[index]) <= 1));
  assert.ok(Math.abs(actual.count - reference.count) / reference.count < 0.01);
});
