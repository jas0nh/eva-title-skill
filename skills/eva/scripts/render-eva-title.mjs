#!/usr/bin/env node

import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { renderEvaTitle, layoutInputCount } from './renderer.mjs';

const usage = 'Usage: node scripts/render-eva-title.mjs --layout e24 --texts "[\\"测试\\"]" --output /absolute/path.png [--font /absolute/path.otf]';
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith('--') || value === undefined) {
    process.stderr.write(`${usage}\n`);
    process.exit(64);
  }
  args.set(key, value);
}

if (args.has('--help')) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

const layout = args.get('--layout') || 'e1';
const output = args.get('--output');
if (!output || !args.has('--texts')) {
  process.stderr.write(`${usage}\n`);
  process.exit(64);
}

let texts;
try {
  texts = JSON.parse(args.get('--texts'));
} catch {
  process.stderr.write('--texts must be a JSON array of strings\n');
  process.exit(64);
}
if (!Array.isArray(texts) || !texts.every((text) => typeof text === 'string')) {
  process.stderr.write('--texts must be a JSON array of strings\n');
  process.exit(64);
}
const expected = layoutInputCount(layout);
if (!expected) {
  process.stderr.write(`Unknown layout: ${layout}\n`);
  process.exit(64);
}
if (texts.length !== expected) {
  process.stderr.write(`Layout ${layout} requires ${expected} text values, received ${texts.length}\n`);
  process.exit(64);
}
if (texts.some((text, index) => !text.trim() && !(layout === 'e1' && index === 2))) {
  process.stderr.write('Text values must not be empty\n');
  process.exit(64);
}

try {
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  const png = renderEvaTitle({ layout, texts, fontPath: args.get('--font') || '' });
  await writeFile(outputPath, png);
  const result = await stat(outputPath);
  if (result.size < 128) throw new Error('renderer produced an empty PNG');
  process.stdout.write(`${JSON.stringify({ ok: true, layout, outputPath, bytes: result.size })}\n`);
} catch (error) {
  process.stderr.write(`${error.name}: ${error.message}\n`);
  process.exitCode = 1;
}
