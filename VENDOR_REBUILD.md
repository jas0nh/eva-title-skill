# Rebuild `vendor/eva-title/html`

This repository intentionally does not need to publish the complete `vendor/` directory to remain understandable or reconstructable. The renderer is based on [itorr/eva-title](https://github.com/itorr/eva-title), pinned to commit:

```text
17257ad5c75bca49ed824a005d13d2de1707cfe9
```

The following commands rebuild the minimum runtime vendor directory from that upstream source. Run them from this repository root.

```bash
VENDOR_TMP_DIR="$(mktemp -d)"
git clone https://github.com/itorr/eva-title.git "$VENDOR_TMP_DIR/eva-title"
git -C "$VENDOR_TMP_DIR/eva-title" checkout 17257ad5c75bca49ed824a005d13d2de1707cfe9

mkdir -p vendor/eva-title/html
cp -R "$VENDOR_TMP_DIR/eva-title/html/." vendor/eva-title/html/
npx --yes less@4.2.0 vendor/eva-title/html/document.less vendor/eva-title/html/document.css
curl -L https://unpkg.com/vue@2.6.11/dist/vue.min.js -o vendor/eva-title/html/vue.2.6.11.min.js
node scripts/patch-eva-title-vendor.mjs vendor/eva-title/html
rm -rf "$VENDOR_TMP_DIR"
```

`scripts/patch-eva-title-vendor.mjs` contains the complete local delta from upstream:

- route font-subset requests through the renderer's current local origin;
- prioritize the locally installed `EVA-Matisse_Classic` family;
- wait for local font availability before Canvas initialization;
- append the local font-face rule to `document.css`.

Validate the rebuilt directory with a real PNG export:

```bash
node scripts/render-eva-title.mjs \
  --layout e1 \
  --texts '["安排","泡汤局","领导喜欢"]' \
  --output /tmp/eva-title.png
```

The static `layout-help.png` image is optional. It is only used by the Feishu adapter's `/eva --help` response; it is not required by the generic renderer or `SKILL.md` workflow. Do not add any locally licensed `.ttf` or `.otf` font files to `vendor/`.

The upstream EVA title source is MIT licensed. Preserve `third_party/eva-title-MIT-LICENSE` and the Vue MIT license when redistributing a rebuilt vendor directory.
