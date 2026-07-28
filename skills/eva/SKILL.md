---
name: eva
description: Render EVA-style title cards as local PNG files with a native Canvas renderer. Use when an agent needs an EVA title image, must select an EVA layout, or needs to export a title card without a hosted image model, Chrome, or Playwright.
---

# EVA Title Cards

Render locally. Do not call an image-generation model.

1. Confirm that `FOT-Matisse Pro EB` and the open-source `Source Han Serif SC Heavy` fallback are installed in the current user's macOS Fonts folder. The renderer first converts simplified Chinese to traditional with the upstream mapping, then uses Matisse where that glyph exists, and otherwise uses Source Han Serif Heavy.
2. Select a layout. `air` and `e24` require one text value; `e25`, `e12`, `e3`, `e25-2`, `e26`, `anno-kandoku`, `e15`, and `do-you-love-me` require two; all others require three.
3. Preserve reading order. For `e1`, supply `[vertical, horizontal, subtitle]`.
4. Run the renderer from this skill directory:

```bash
npm ci --omit=dev
node scripts/render-eva-title.mjs --layout e24 --texts '["测试"]' --output /absolute/path/eva-test.png
```

5. Verify the PNG exists and is nonempty before sharing it. Use `--font /absolute/path/font.otf` only to override the installed local font.
