---
name: eva-title-skill
description: Render EVA-style title cards locally with itorr/eva-title's original Canvas layouts. Use when an AI agent needs to generate a title card from user text, select an EVA layout, or export a PNG without using a hosted image model.
---

# EVA Title Skill

Use the local Canvas renderer. It does not call an image-generation model.

1. Remove whitespace and punctuation from the requested title before planning text slots.
2. Select a layout. `air` and `e24` take one text slot; `e25`, `e12`, `e3`, `e25-2`, `e26`, `anno-kandoku`, `e15`, and `do-you-love-me` take two; the remaining layouts take three.
3. Keep every character in normal reading order. For `e1`, plan `subtitle`, `vertical`, `horizontal` semantically, then pass the renderer `[vertical, horizontal, subtitle]`.
4. Use balanced character splits only when semantic splitting cannot fill every required slot.
5. Render a PNG with the bundled wrapper. For example:

```bash
node scripts/render-eva-title.mjs \
  --layout e1 \
  --texts '["安排","泡汤局","领导喜欢"]' \
  --output /absolute/path/eva-title.png
```

Inspect `vendor/eva-title/html/layout-help.png` when choosing among the 16 layouts. Verify that the output file exists and is nonblank before returning it.

The renderer needs Node.js, Playwright and local Chrome. Install an appropriately licensed EVA-Matisse font locally for the closest match; do not add font files to this skill.

`adapters/feishu/` is an optional transport implementation. It is not required when another AI runtime can invoke the bundled CLI directly.
