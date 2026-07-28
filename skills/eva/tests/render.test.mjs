import assert from 'node:assert/strict';
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

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

test('renders every declared layout as a 1280x960 PNG', () => {
  for (const [layout, count] of Object.entries(LAYOUTS)) {
    const output = join(work, `${layout}.png`);
    const result = run(['--layout', layout, '--texts', JSON.stringify(sample.slice(0, count)), '--output', output, '--font', font]);
    assert.equal(result.status, 0, `${layout}: ${result.stderr}`);
    assert.equal(existsSync(output), true, layout);
    const png = readFileSync(output);
    assert.equal(png.subarray(1, 4).toString(), 'PNG', layout);
    assert.equal(png.readUInt32BE(16), 1280, layout);
    assert.equal(png.readUInt32BE(20), 960, layout);
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
