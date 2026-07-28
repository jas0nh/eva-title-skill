---
name: eva
description: Render original itorr/eva-title layouts as local PNG files by running the vendored Canvas layout code on native Skia. Use when an agent needs an EVA title image, must select one of the 16 original layouts, or needs a browser-free 640x480 title-card export.
---

# EVA Title Cards

Render locally with the vendored original layout engine. Do not call an image-generation model or recreate layout geometry.

1. Confirm that `FOT-Matisse Pro EB` and the open-source `Source Han Serif SC Heavy` fallback are installed in the current user's macOS Fonts folder. The renderer first converts simplified Chinese to traditional with the upstream mapping, then uses Matisse where that glyph exists, and otherwise uses Source Han Serif Heavy.
2. Select a layout. `air` and `e24` require one text value; `e25`, `e12`, `e3`, `e25-2`, `e26`, `anno-kandoku`, `e15`, and `do-you-love-me` require two; all others require three.
3. Preserve reading order. For `e1`, supply `[vertical, horizontal, subtitle]`.
4. Run the renderer from this skill directory:

```bash
npm ci --omit=dev
node scripts/render-eva-title.mjs --layout e24 --texts '["测试"]' --output /absolute/path/eva-test.png
```

5. Verify the PNG is 640×480 and nonempty before sharing it. Use `--font /absolute/path/font.otf` only to override the installed local font.
