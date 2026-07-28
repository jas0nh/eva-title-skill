import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';

const SIZE = { width: 1280, height: 960 };
const LOCAL_FONT = join(homedir(), 'Library', 'Fonts', 'FOT-Matisse Pro EB.otf');
const FONT_FAMILY = 'EVA Local Matisse';
const CJK_FAMILY = 'EVA Source Han Fallback';
const sourceHanCandidates = [
  process.env.EVA_SOURCE_HAN_SERIF_CN_HEAVY_PATH,
  '/Users/insta360/Library/Fonts/SourceHanSerifCN-Heavy.otf',
  join(homedir(), 'Library', 'Fonts', 'SourceHanSerifSC-Heavy.otf'),
].filter(Boolean);
const sourceHanPath = sourceHanCandidates.find((path) => existsSync(path)) || '';
const upstreamTransform = vm.runInNewContext(
  `${readFileSync(new URL('../references/upstream-transform-func.js', import.meta.url), 'utf8')}\ntransformFunc`,
  Object.create(null),
);
const matisseGlyphs = new Set(vm.runInNewContext(
  `${readFileSync(new URL('../references/upstream-matisse-glyphs.js', import.meta.url), 'utf8')}\nEVAMatisseClassicMojis`,
  Object.create(null),
));
let registeredFont = '';

export const LAYOUTS = Object.freeze({
  e1: 3, e13: 3, e25: 2, e12: 2, e3: 2, 'e25-2': 2, e4: 3,
  air: 1, e24: 1, e26: 2, 'anno-kandoku': 2, e15: 2,
  'eng-title': 3, 'do-you-love-me': 2, e20: 3, e10: 3,
});

export function layoutInputCount(layout) {
  return LAYOUTS[layout] || 0;
}

export function toTraditional(text) {
  return upstreamTransform[2](text);
}

function usesMatisse(text) {
  return [...text].every((character) => matisseGlyphs.has(character));
}

function registerFont(fontPath, texts) {
  const target = fontPath || LOCAL_FONT;
  if (!existsSync(target)) throw new Error(`EVA font is unavailable: ${target}`);
  if (registeredFont !== target) {
    if (!GlobalFonts.registerFromPath(target, FONT_FAMILY)) {
      throw new Error(`Unable to register EVA font: ${target}`);
    }
    registeredFont = target;
  }
  if (texts.some((text) => !usesMatisse(text))) {
    if (!sourceHanPath) {
      throw new Error('Source Han Serif CN Heavy fallback font is unavailable; install it locally or set EVA_SOURCE_HAN_SERIF_CN_HEAVY_PATH');
    }
    if (!GlobalFonts.has(CJK_FAMILY) && !GlobalFonts.registerFromPath(sourceHanPath, CJK_FAMILY)) {
      throw new Error(`Unable to register Source Han fallback font: ${sourceHanPath}`);
    }
  }
}

function fontFor(text, size) {
  const family = usesMatisse(text) ? FONT_FAMILY : CJK_FAMILY;
  return `900 ${size}px "${family}", serif`;
}

function colors(layout) {
  if (layout === 'e24' || layout === 'e15') return { bg: '#e4e0e8', fg: '#030201', shadow: 'rgba(255,165,255,.20)' };
  if (layout === 'e10') return { bg: '#180000', fg: '#d00', shadow: 'rgba(255,0,0,.50)' };
  return { bg: '#030201', fg: '#e4e0e8', shadow: 'rgba(255,165,0,.60)' };
}

function setup(ctx, palette, size, shadow = true, text = '') {
  ctx.font = fontFor(text, size);
  ctx.fillStyle = palette.fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.shadowColor = shadow ? palette.shadow : 'transparent';
  ctx.shadowBlur = shadow ? 38 : 0;
}

function fitSize(ctx, text, maxWidth, start) {
  let size = start;
  while (size > 18) {
    ctx.font = fontFor(text, size);
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

function line(ctx, text, x, y, maxWidth, size, palette, options = {}) {
  const finalSize = fitSize(ctx, text, maxWidth, size);
  setup(ctx, palette, finalSize, options.shadow !== false, text);
  if (options.align) ctx.textAlign = options.align;
  ctx.fillText(text, x, y);
  return finalSize;
}

function vertical(ctx, text, x, top, maxHeight, size, palette, options = {}) {
  const characters = [...text];
  const stride = Math.min(size, maxHeight / Math.max(1, characters.length));
  const finalSize = Math.max(20, stride * (options.scale || .94));
  setup(ctx, palette, finalSize, options.shadow !== false, text);
  for (const [index, character] of characters.entries()) {
    ctx.fillText(character, x, top + stride * (index + .5));
  }
  return finalSize;
}

function rule(ctx, x1, y1, x2, y2, palette, width = 10) {
  ctx.shadowBlur = 0;
  ctx.strokeStyle = palette.fg;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function twoRows(ctx, a, b, sub, palette, compact = false) {
  line(ctx, a, 120, compact ? 270 : 310, 1040, compact ? 220 : 250, palette);
  line(ctx, b, 120, compact ? 560 : 630, 1040, compact ? 220 : 250, palette);
  if (sub) line(ctx, sub, 1160, 840, 440, 92, palette, { align: 'right' });
}

export function renderEvaTitle({ layout, texts, fontPath = '' }) {
  if (!layoutInputCount(layout)) throw new Error(`Unknown layout: ${layout}`);
  const normalizedTexts = texts.map(toTraditional);
  registerFont(fontPath, normalizedTexts);
  const canvas = createCanvas(SIZE.width, SIZE.height);
  const ctx = canvas.getContext('2d');
  const palette = colors(layout);
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, SIZE.width, SIZE.height);
  const [a = '', b = '', c = ''] = normalizedTexts;
  const pad = 80;

  switch (layout) {
    case 'e24':
      vertical(ctx, a, 590, 120, 720, 520, palette, { shadow: false, scale: .98 });
      rule(ctx, 505, 110, 505, 850, palette, 5);
      rule(ctx, 775, 110, 775, 850, palette, 5);
      break;
    case 'air':
      line(ctx, a, 640, 490, 1100, 280, palette, { align: 'center' });
      rule(ctx, 180, 650, 1100, 650, palette, 8);
      break;
    case 'e1':
      vertical(ctx, a, 210, 170, 650, 500, palette);
      line(ctx, '、', 340, 730, 160, 160, palette);
      line(ctx, b, 420, 700, 720, 310, palette);
      if (c) line(ctx, c, 100, 105, 760, 110, palette);
      break;
    case 'e13':
      line(ctx, a, 105, 260, 780, 270, palette);
      vertical(ctx, b, 900, 130, 670, 440, palette);
      if (c) line(ctx, c, 105, 835, 700, 110, palette);
      break;
    case 'e25':
      line(ctx, a, 640, 470, 900, 260, palette, { align: 'center' });
      if (b) line(ctx, b, 640, 760, 700, 120, palette, { align: 'center' });
      break;
    case 'e12':
      vertical(ctx, a, 260, 150, 650, 480, palette);
      line(ctx, b, 620, 680, 560, 230, palette);
      break;
    case 'e3':
      line(ctx, a, 120, 310, 1000, 250, palette);
      vertical(ctx, b, 950, 380, 440, 300, palette);
      break;
    case 'e25-2':
      line(ctx, a, 120, 300, 1040, 270, palette);
      if (b) line(ctx, b, 1120, 780, 780, 120, palette, { align: 'right' });
      break;
    case 'e4':
      line(ctx, a, 110, 240, 500, 260, palette);
      line(ctx, '、', 430, 330, 170, 160, palette);
      vertical(ctx, b, 850, 210, 580, 350, palette);
      if (c) line(ctx, c, 120, 800, 620, 120, palette);
      break;
    case 'e26': {
      const rows = a.match(/.{1,6}/gu) || [''];
      rows.forEach((row, index) => line(ctx, row, 150, 260 + index * 175, 1000, 170, palette));
      if (b) line(ctx, b, 640, 100, 600, 105, palette, { align: 'center' });
      break;
    }
    case 'anno-kandoku':
      vertical(ctx, a.slice(0, Math.ceil([...a].length / 2)), 190, 280, 520, 340, palette);
      line(ctx, [...a].slice(Math.ceil([...a].length / 2)).join(''), 350, 720, 720, 240, palette);
      line(ctx, b, 1120, 130, 600, 110, palette, { align: 'right' });
      break;
    case 'e15':
      line(ctx, a.slice(0, Math.ceil([...a].length / 2)), 430, 330, 560, 250, palette, { shadow: false });
      vertical(ctx, [...a].slice(Math.ceil([...a].length / 2)).join(''), 820, 180, 530, 320, palette, { shadow: false });
      vertical(ctx, b, 150, 230, 390, 180, palette, { shadow: false });
      break;
    case 'eng-title': {
      const words = a.split(/\s+/).filter(Boolean);
      words.forEach((word, index) => line(ctx, word, 100, 180 + index * 150, 1080, 150, palette));
      line(ctx, b, 100, 700, 720, 96, palette);
      line(ctx, c, 1160, 830, 580, 120, palette, { align: 'right' });
      break;
    }
    case 'do-you-love-me':
      if (b) line(ctx, b, 640, 300, 700, 92, palette, { align: 'center' });
      line(ctx, a, 640, b ? 590 : 470, 1040, 230, palette, { align: 'center' });
      break;
    case 'e20':
      line(ctx, a.slice(0, 1), 150, 250, 280, 290, palette);
      line(ctx, a.slice(1), 470, 260, 650, 190, palette);
      line(ctx, b.slice(0, 1), 150, 650, 280, 290, palette);
      line(ctx, b.slice(1), 470, 660, 650, 190, palette);
      if (c) line(ctx, c, 1130, 470, 480, 85, palette, { align: 'right' });
      break;
    case 'e10':
      twoRows(ctx, a, b, c, palette, true);
      break;
    default:
      twoRows(ctx, a, b, c, palette);
  }
  return canvas.toBuffer('image/png');
}
