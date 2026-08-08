# EVA Title Card Generator

**A browser-free Neon Genesis Evangelion title-card generator for Hermes and Node.js. Render all 16 original layouts locally with native Canvas/Skia — no Chrome, Playwright, web server, or remote font proxy.**

**English** · [简体中文](README.zh-CN.md)

![Sixteen EVA title-card layouts rendered locally](.github/eva-help.png)

## Why this version?

The excellent upstream [`itorr/eva-title`](https://github.com/itorr/eva-title) is browser-based. This project keeps its original `layouts.js` and `make.js` geometry while adding:

- **Native local rendering** with `@napi-rs/canvas` / Skia
- **All 16 upstream layouts**, including their coordinates, scale, shadows, color, and noise
- **A standalone Node.js CLI** that exports deterministic 640×480 PNG files
- **A Hermes `/eva` skill command** with segmentation, layout selection, and a visual help sheet
- **No browser or web service** in the rendering path

<p align="center">
  <img src=".github/eva-e24-test.png" width="640" alt="EVA e24 layout rendering the Chinese word test">
</p>

## Requirements

| Requirement | Notes |
|---|---|
| macOS | Current font discovery targets the user's macOS Fonts directory |
| Node.js | Node 18 or newer recommended |
| Matisse font | Supply your own licensed `FOT-Matisse Pro EB.otf`; this repository does not distribute it |
| Source Han Serif SC Heavy | Open-source fallback for glyphs absent from Matisse |
| Hermes | Optional; the renderer also works as a standalone Node CLI |

Install both fonts in `~/Library/Fonts/`, or pass another compatible font file with `--font`. Missing required fonts produce an explicit error instead of silently substituting a different visual style.

## Standalone Node.js CLI

```bash
git clone https://github.com/jas0nh/eva-title-skill.git
cd eva-title-skill/skills/eva
npm ci
node scripts/render-eva-title.mjs \
  --layout e24 \
  --texts '["测试"]' \
  --output /tmp/eva-title.png
```

The output is a local 640×480 PNG.

## Install as a Hermes skill

```bash
hermes skills install jas0nh/eva-title-skill/skills/eva --category self-built
cd ~/.hermes/skills/self-built/eva
npm ci --omit=dev
node scripts/eva-command.mjs --command '--help' --output-dir /tmp/eva-output
```

Start a new Hermes session if needed, then use:

```text
/eva --help
/eva --e24 TEST
/eva --e1 TOP|VERTICAL|HORIZONTAL
```

`eva-command.mjs` owns command parsing, punctuation cleanup, semantic segmentation, help-sheet generation, and the final `MEDIA:` output used by Hermes.

## Layout fidelity

The renderer runs the upstream layout and drawing functions directly. A lightweight native compatibility layer replaces browser DOM and Canvas APIs, but does not redraw the layouts from scratch. Simplified Chinese is transformed with the upstream mapping before glyph fallback.

Run the regression suite from `skills/eva/`:

```bash
npm test
```

## Integrations

`adapters/feishu/` is an optional transport layer. It invokes the same one-shot local CLI and expects credentials to be injected by its runtime; it does not read the macOS Keychain.

## Attribution and license

Layout implementations, Canvas drawing functions, character mappings, and the Matisse glyph inventory come from [`itorr/eva-title`](https://github.com/itorr/eva-title) under its MIT license; see [`third_party/eva-title-MIT-LICENSE`](third_party/eva-title-MIT-LICENSE). Source Han Serif is maintained by Adobe under its own open-source license. Local commercial font files must not be committed or redistributed.

This is an unofficial fan-made developer tool and is not affiliated with or endorsed by the Evangelion rights holders.

The original wrapper code in this repository is released under the [MIT License](LICENSE).
