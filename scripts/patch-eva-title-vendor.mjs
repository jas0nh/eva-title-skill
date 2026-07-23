#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const vendorDir = resolve(process.argv[2] || resolve(rootDir, 'vendor/eva-title/html'));

async function replaceRequired(path, before, after) {
  const source = await readFile(path, 'utf8');
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Unexpected upstream content: ${path}`);
  await writeFile(path, source.replace(before, after), 'utf8');
}

await replaceRequired(
  resolve(vendorDir, 'document.js'),
  'let fontAPI = `https://${location.hostname}/api/fontmin`;',
  'let fontAPI = `${location.origin}/api/fontmin`;',
);
await replaceRequired(
  resolve(vendorDir, 'document.js'),
  "let haveMatisse = checkFont('EVA_Matisse_Classic-EB,MatissePro-EB') > 120;",
  "let haveMatisse = checkFont('EVA-Matisse_Classic,EVA_Matisse_Classic-EB,MatissePro-EB') > 120;",
);
await replaceRequired(
  resolve(vendorDir, 'document.js'),
  `c(_=>{\n    const GET = getQuerys();\n    const layoutId = GET['layout'] || 'e1';\n    if(Layouts[layoutId]){\n        app.setLayout(Layouts[layoutId],1);\n    }\n\n    app.loading = false;\n});`,
  `const initialize = async _=>{\n    let localMatisseLoaded = false;\n    try{\n        await document.fonts.load('900 18px EVA-Matisse_Classic');\n        localMatisseLoaded = true;\n    }catch(_){\n        // Missing local font falls back to the upstream font subset service.\n    }\n    haveMatisse = localMatisseLoaded || checkFont('EVA-Matisse_Classic,EVA_Matisse_Classic-EB,MatissePro-EB') > 120;\n    c(_=>{\n        const GET = getQuerys();\n        const layoutId = GET['layout'] || 'e1';\n        if(Layouts[layoutId]){\n            app.setLayout(Layouts[layoutId],1);\n        }\n\n        app.loading = false;\n    });\n}\n\ninitialize();`,
);
await replaceRequired(
  resolve(vendorDir, 'make.js'),
  "let baseFontFamilyName = 'EVA_Matisse_Classic-EB,MatissePro-EB,baseSplit,notdef,SourceHanSerifCN-Heavy,serif';",
  "let baseFontFamilyName = 'EVA-Matisse_Classic,EVA_Matisse_Classic-EB,MatissePro-EB,baseSplit,SourceHanSerifCN-Heavy,notdef,serif';",
);

const cssPath = resolve(vendorDir, 'document.css');
const css = await readFile(cssPath, 'utf8');
if (!css.includes("src: url('/local-eva-matisse.ttf')")) {
  await writeFile(cssPath, `${css}\n@font-face {\n    font-family: 'EVA-Matisse_Classic';\n    src: url('/local-eva-matisse.ttf') format('truetype');\n    font-weight: 100 900;\n    font-style: normal;\n    font-display: block;\n}\n`, 'utf8');
}