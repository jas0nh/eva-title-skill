#!/usr/bin/env node

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYOUTS, renderEvaTitle, vendorLayoutDefaults } from './renderer.mjs';

const WIDTH = 1440;
const HEIGHT = 1549;
const MARGIN = 32;
const GAP = 16;
const HEADER = 262;
const FOOTER = 46;
const TILE_WIDTH = (WIDTH - MARGIN * 2 - GAP * 3) / 4;
const TILE_IMAGE_HEIGHT = TILE_WIDTH * 0.75;
const TILE_LABEL_HEIGHT = 36;

function text(context, value, x, y, size, weight = 700, color = '#ededed', family = '"SourceHanSerifCN-Heavy", "PingFang SC", sans-serif') {
  context.fillStyle = color;
  context.font = `${weight} ${size}px ${family}`;
  context.textBaseline = 'top';
  context.fillText(value, x, y);
}

export async function renderEvaHelp({ outputPath, fontPath = '' }) {
  const layouts = Object.keys(LAYOUTS);
  renderEvaTitle({ layout: 'e24', texts: vendorLayoutDefaults('e24'), fontPath });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const context = canvas.getContext('2d');
  context.fillStyle = '#101010';
  context.fillRect(0, 0, WIDTH, HEIGHT);

  text(context, 'EVA 标题卡版式', MARGIN, 30, 38, 900);
  text(context, '使用：/eva --版式 标题', MARGIN, 88, 20);
  text(context, '手动断句：/eva --e1 顶部|竖排|横排', MARGIN, 126, 20);
  text(context, '例如：/eva --e1 我|讨厌|上班', MARGIN, 164, 20);
  context.fillStyle = '#9d1717';
  context.fillRect(MARGIN, 210, 272, 42);
  text(context, '/eva --help', MARGIN + 16, 216, 22, 900, '#fff');

  for (const [index, layout] of layouts.entries()) {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = MARGIN + column * (TILE_WIDTH + GAP);
    const y = HEADER + row * (TILE_IMAGE_HEIGHT + TILE_LABEL_HEIGHT + GAP);
    const png = renderEvaTitle({ layout, texts: vendorLayoutDefaults(layout), fontPath });
    const image = await loadImage(png);
    context.drawImage(image, x, y, TILE_WIDTH, TILE_IMAGE_HEIGHT);
    context.fillStyle = '#101010';
    context.fillRect(x, y + TILE_IMAGE_HEIGHT, TILE_WIDTH, TILE_LABEL_HEIGHT);
    context.strokeStyle = '#444';
    context.lineWidth = 1;
    context.strokeRect(x, y, TILE_WIDTH, TILE_IMAGE_HEIGHT + TILE_LABEL_HEIGHT);
    text(context, `--${layout}`, x + 12, y + TILE_IMAGE_HEIGHT + 7, 17, 800, '#ededed', 'Menlo, monospace');
  }

  text(
    context,
    '标题会自动移除空白和标点；未指定版式时默认 --e1。',
    MARGIN,
    HEIGHT - FOOTER + 8,
    18,
    500,
    '#bbb',
  );

  const target = resolve(outputPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, canvas.toBuffer('image/png'));
  return target;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputIndex = process.argv.indexOf('--output');
  const fontIndex = process.argv.indexOf('--font');
  if (outputIndex < 0 || !process.argv[outputIndex + 1]) {
    process.stderr.write('Usage: node scripts/render-eva-help.mjs --output /absolute/path.png [--font /path/font.otf]\n');
    process.exit(64);
  }
  try {
    const outputPath = await renderEvaHelp({
      outputPath: process.argv[outputIndex + 1],
      fontPath: fontIndex >= 0 ? process.argv[fontIndex + 1] || '' : '',
    });
    process.stdout.write(`${JSON.stringify({ ok: true, kind: 'help', outputPath })}\n`);
  } catch (error) {
    process.stderr.write(`${error.name}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
