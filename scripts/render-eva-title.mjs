#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import readline from 'node:readline';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

if (args.has('--help') || !args.get('--output') || !args.get('--texts')) {
  process.stderr.write('Usage: node scripts/render-eva-title.mjs --layout e1 --texts "[\\"vertical\\",\\"horizontal\\",\\"subtitle\\"]" --output /absolute/path.png [--assets path] [--playwright-module path]\n');
  process.exit(args.has('--help') ? 0 : 64);
}

let texts;
try {
  texts = JSON.parse(args.get('--texts'));
} catch {
  process.stderr.write('--texts must be a JSON array of strings\n');
  process.exit(64);
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rendererPath = resolve(rootDir, 'scripts/eva-title-renderer.mjs');
const assetDir = resolve(args.get('--assets') || resolve(rootDir, 'vendor/eva-title/html'));
const rendererArgs = [rendererPath, '--assets', assetDir];
for (const option of ['--playwright-module', '--font']) {
  if (args.get(option)) rendererArgs.push(option, args.get(option));
}
const child = spawn(process.execPath, rendererArgs, { stdio: ['pipe', 'pipe', 'inherit'] });
const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
const requestId = `single-${Date.now()}`;

lines.on('line', (line) => {
  let response;
  try {
    response = JSON.parse(line);
  } catch {
    return;
  }
  if (response.type === 'ready' && response.ok) {
    child.stdin.write(`${JSON.stringify({
      id: requestId,
      layout: args.get('--layout') || 'e1',
      texts,
      outputPath: resolve(args.get('--output')),
    })}\n`);
    return;
  }
  if (response.id === requestId) {
    process.stdout.write(`${JSON.stringify(response)}\n`);
    child.kill('SIGTERM');
    process.exitCode = response.ok ? 0 : 1;
  }
});

child.once('error', (error) => {
  process.stderr.write(`${error.name}: ${error.message}\n`);
  process.exitCode = 1;
});