#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutInputCount } from './renderer.mjs';
import { renderEvaHelp } from './render-eva-help.mjs';
import { spawnSync } from 'node:child_process';

const LAYOUT_TOKEN = /^--([a-z0-9-]+)(?:\s+|$)/i;
const CLEANUP = /[\p{White_Space}\p{P}]/gu;
const HELP_TEXT = [
  'EVA 标题卡用法：`/eva --版式 标题`',
  '例如：`/eva --e1 领导喜欢安排泡汤局`、`/eva --e26 世界中心`',
  '手动断句：`/eva --e1 顶部|竖排|横排`，例如 `我|讨厌|上班`。',
  '不写版式时默认 `--e1`；标题中的空白和标点会自动移除。',
  '可用版式：--e1, --e13, --e25, --e12, --e3, --e25-2, --e4, --air, --e24, --e26, --anno-kandoku, --e15, --eng-title, --do-you-love-me, --e20, --e10',
  '发送 `/eva --help` 可再次查看版式示例图。',
].join('\n');

export function cleanEvaText(value) {
  return String(value || '').normalize('NFKC').replace(CLEANUP, '');
}

export function parseEvaCommand(command) {
  let input = String(command || '').trim();
  input = input.replace(/^\/eva(?:\s+|$)/i, '').trim();
  if (!input || /^--help$/i.test(input)) return { kind: 'help' };

  let layout = 'e1';
  const layoutMatch = input.match(LAYOUT_TOKEN);
  if (layoutMatch) {
    layout = layoutMatch[1].toLowerCase();
    input = input.slice(layoutMatch[0].length);
  }
  const slots = layoutInputCount(layout);
  if (!slots) throw new Error(`不支持的 EVA 版式：--${layout}`);

  const rawSegments = input.includes('|') ? input.split('|') : null;
  const title = cleanEvaText(input.replaceAll('|', ''));
  if (!title) throw new Error('请在 /eva 后填写标题文字。');

  let manualSegments = null;
  if (rawSegments) {
    manualSegments = rawSegments.map(cleanEvaText);
    if (manualSegments.length !== slots || manualSegments.some((segment) => !segment)) {
      throw new Error(`--${layout} 需要 ${slots} 个非空分段。`);
    }
  }
  return { kind: 'render', layout, slots, title, manualSegments };
}

function balancedSegments(title, slots) {
  const characters = [...title];
  if (characters.length < slots) throw new Error(`标题无法拆分为 ${slots} 个非空分段。`);
  const result = [];
  let offset = 0;
  for (let index = 0; index < slots; index += 1) {
    const remaining = characters.length - offset;
    const remainingSlots = slots - index;
    const size = Math.ceil(remaining / remainingSlots);
    result.push(characters.slice(offset, offset + size).join(''));
    offset += size;
  }
  return result;
}

export function rendererTexts(parsed, semanticSegments = null) {
  if (parsed.kind !== 'render') throw new Error('Render command required');
  let segments = semanticSegments || parsed.manualSegments;
  if (!segments) segments = parsed.slots === 1 ? [parsed.title] : balancedSegments(parsed.title, parsed.slots);
  segments = segments.map(cleanEvaText);
  if (
    segments.length !== parsed.slots
    || segments.some((segment) => !segment)
    || segments.join('') !== parsed.title
  ) {
    throw new Error(`分段必须是 ${parsed.slots} 个非空字符串，且合并后等于清洗后的标题。`);
  }
  if (parsed.layout === 'e1') return [segments[1], segments[2], segments[0]];
  return segments;
}

function readArguments(argv) {
  const values = new Map();
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('参数必须使用 --key value。');
    values.set(key, value);
  }
  return values;
}

export async function runEvaCommand({ command, outputDir, semanticSegments = null, fontPath = '' }) {
  const parsed = parseEvaCommand(command);
  await mkdir(outputDir, { recursive: true });
  if (parsed.kind === 'help') {
    const outputPath = join(outputDir, 'eva-layout-help.png');
    await renderEvaHelp({ outputPath, fontPath });
    return { ok: true, kind: 'help', text: HELP_TEXT, outputPath, media: `MEDIA:${outputPath}` };
  }

  const texts = rendererTexts(parsed, semanticSegments);
  const digest = createHash('sha256').update(`${parsed.layout}\0${texts.join('\0')}`).digest('hex').slice(0, 12);
  const outputPath = join(outputDir, `eva-${parsed.layout}-${digest}.png`);
  const renderer = fileURLToPath(new URL('./render-eva-title.mjs', import.meta.url));
  const args = [
    renderer,
    '--layout', parsed.layout,
    '--texts', JSON.stringify(texts),
    '--output', outputPath,
  ];
  if (fontPath) args.push('--font', fontPath);
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'EVA renderer failed');
  return {
    ok: true,
    kind: 'render',
    layout: parsed.layout,
    title: parsed.title,
    texts,
    outputPath,
    media: `MEDIA:${outputPath}`,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = readArguments(process.argv);
    const command = args.get('--command');
    const outputDir = resolve(args.get('--output-dir') || '/tmp');
    if (command === undefined) throw new Error('缺少 --command。');
    let semanticSegments = null;
    if (args.has('--segments')) {
      semanticSegments = JSON.parse(args.get('--segments'));
      if (!Array.isArray(semanticSegments) || !semanticSegments.every((value) => typeof value === 'string')) {
        throw new Error('--segments 必须是字符串数组 JSON。');
      }
    }
    const response = await runEvaCommand({
      command,
      outputDir,
      semanticSegments,
      fontPath: args.get('--font') || '',
    });
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.name}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
