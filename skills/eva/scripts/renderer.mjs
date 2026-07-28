import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';

const LOCAL_FONT = join(homedir(), 'Library', 'Fonts', 'FOT-Matisse Pro EB.otf');
const FONT_ALIASES = ['EVAMatisseClassic', 'EVA_Matisse_Classic-EB', 'MatissePro-EB'];
const FALLBACK_ALIASES = ['SourceHanSerifCN-Heavy', 'EVA Source Han Fallback'];
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
const vendorSource = [
  readFileSync(new URL('../vendor/layouts.js', import.meta.url), 'utf8'),
  readFileSync(new URL('../vendor/make.js', import.meta.url), 'utf8'),
  'globalThis.__evaVendor = { layouts, make };',
].join('\n');

let registeredMatisse = '';
let fallbackRegistered = false;

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

function registerFonts(fontPath) {
  const target = fontPath || LOCAL_FONT;
  if (!existsSync(target)) throw new Error(`EVA font is unavailable: ${target}`);
  if (registeredMatisse !== target) {
    for (const alias of FONT_ALIASES) {
      if (!GlobalFonts.registerFromPath(target, alias)) {
        throw new Error(`Unable to register EVA font: ${target}`);
      }
    }
    registeredMatisse = target;
  }
  if (!sourceHanPath) {
    throw new Error('Source Han Serif CN Heavy fallback font is unavailable; install it locally or set EVA_SOURCE_HAN_SERIF_CN_HEAVY_PATH');
  }
  if (!fallbackRegistered) {
    for (const alias of FALLBACK_ALIASES) {
      if (!GlobalFonts.registerFromPath(sourceHanPath, alias)) {
        throw new Error(`Unable to register Source Han fallback font: ${sourceHanPath}`);
      }
    }
    fallbackRegistered = true;
  }
}

function nativeDocument() {
  const canvasBox = {
    appendChild(child) {
      child.parentNode = this;
      return child;
    },
    removeChild(child) {
      child.parentNode = null;
      return child;
    },
  };
  const body = {
    offsetWidth: 1280,
    appendChild(child) {
      child.parentNode = this;
      return child;
    },
  };
  return {
    body,
    createElement(tag) {
      if (tag !== 'canvas') return { ...canvasBox, className: '', parentNode: null };
      const canvas = createCanvas(1, 1);
      canvas.style = {};
      canvas.parentNode = null;
      return canvas;
    },
  };
}

function seededMath() {
  let state = 0x455641;
  const math = Object.create(Math);
  math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return math;
}

function loadVendorRuntime() {
  const context = vm.createContext({
    console,
    document: nativeDocument(),
    navigator: { userAgent: 'EVA native canvas', vendor: '' },
    Math: seededMath(),
  });
  vm.runInContext(vendorSource, context, { filename: 'eva-title-vendor.js' });
  return context.__evaVendor;
}

export function renderEvaTitle({ layout, texts, fontPath = '' }) {
  if (!layoutInputCount(layout)) throw new Error(`Unknown layout: ${layout}`);
  registerFonts(fontPath);
  const normalizedTexts = texts.map((text) => (typeof text === 'string' ? toTraditional(text) : text));
  const runtime = loadVendorRuntime();
  const vendorLayout = runtime.layouts.find((candidate) => candidate.id === layout);
  if (!vendorLayout) throw new Error(`Vendor layout is unavailable: ${layout}`);
  const config = {
    blur: true,
    height: 480,
    shadow: true,
    convolute: false,
    retina: true,
    plan: undefined,
    noise: true,
    outputRatio: 1.334,
    ...(vendorLayout.config || {}),
  };
  const outputCanvas = runtime.make({
    outputCanvas: createCanvas(1, 1),
    canvas: createCanvas(1, 1),
    texts: normalizedTexts,
    config,
    layout: vendorLayout,
  });
  return outputCanvas.toBuffer('image/png');
}

export function vendorLayoutDefaults(layout) {
  if (!layoutInputCount(layout)) throw new Error(`Unknown layout: ${layout}`);
  const runtime = loadVendorRuntime();
  const vendorLayout = runtime.layouts.find((candidate) => candidate.id === layout);
  if (!vendorLayout) throw new Error(`Vendor layout is unavailable: ${layout}`);
  return vendorLayout.inputs.map((input) => {
    if (input.type === 'tab') return input.options?.[0]?.value ?? input.options?.[0] ?? 0;
    return input.placeholder || '';
  });
}
