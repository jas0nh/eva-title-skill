---
name: eva
description: Handle the Hermes `/eva` slash command and render original itorr/eva-title layouts as local PNG files on native Skia. Use for `/eva [--layout] title`, `/eva --help`, EVA title-card requests, manual `|` segmentation, or browser-free exports using any of the 16 original layouts.
---

# EVA Title Cards

Render locally with the vendored original layout engine. Do not call an image-generation model or recreate layout geometry.

## Slash-command contract

Treat the instruction appended to a `/eva` invocation as command arguments.

- Run `node scripts/eva-command.mjs --command '<arguments>' --output-dir /tmp/eva-output`.
- For `--help` or a bare `/eva`, return the JSON `text` and its exact `MEDIA:` value. This generates the 16-layout help image locally.
- Default to `e1` when no layout is supplied.
- Split manual `|` segments before removing punctuation and whitespace. For `e1`, users specify `[top, vertical, horizontal]`; the command wrapper converts it to vendor order.
- Without `|`, choose natural semantic segments when the layout needs multiple inputs. Pass them with `--segments '["segment 1","segment 2"]'`. Preserve every cleaned title character exactly once and in order. If no semantic split is supplied, the wrapper uses a balanced fallback.
- Return the exact `MEDIA:` value from successful JSON so Hermes sends the PNG as a native attachment.

Examples:

```bash
node scripts/eva-command.mjs --command '--e24 测试' --output-dir /tmp/eva-output
node scripts/eva-command.mjs --command '--e1 顶部|竖排|横排' --output-dir /tmp/eva-output
node scripts/eva-command.mjs --command '--e1 领导喜欢安排泡汤局' \
  --segments '["领导","喜欢安排","泡汤局"]' --output-dir /tmp/eva-output
node scripts/eva-command.mjs --command '--help' --output-dir /tmp/eva-output
```

## Rendering rules

Confirm that `FOT-Matisse Pro EB` and open-source `Source Han Serif SC Heavy` are installed in the current user's macOS Fonts folder. Convert simplified Chinese with the upstream mapping, then use Matisse per glyph and Source Han Serif Heavy as fallback.

`air` and `e24` require one semantic segment. `e25`, `e12`, `e3`, `e25-2`, `e26`, `anno-kandoku`, `e15`, and `do-you-love-me` require two. All other layouts require three.

Use `scripts/render-eva-title.mjs` directly only when the caller already provides vendor-order `--texts`. Verify title PNGs are 640×480 and nonempty before sharing them.
