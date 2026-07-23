#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_REPO="https://github.com/itorr/eva-title.git"
UPSTREAM_REVISION="17257ad5c75bca49ed824a005d13d2de1707cfe9"
TARGET_DIR="$ROOT_DIR/vendor/eva-title/html"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

[ -d "$ROOT_DIR/vendor/eva-title" ] || {
  printf 'Missing vendor root: %s\n' "$ROOT_DIR/vendor/eva-title" >&2
  exit 1
}
[ -f "$ROOT_DIR/assets/layout-help.png" ] || {
  printf 'Missing skill asset: %s\n' "$ROOT_DIR/assets/layout-help.png" >&2
  exit 1
}

git clone --quiet "$UPSTREAM_REPO" "$WORK_DIR/eva-title"
git -C "$WORK_DIR/eva-title" checkout --quiet "$UPSTREAM_REVISION"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -R "$WORK_DIR/eva-title/html/." "$TARGET_DIR/"
cp "$ROOT_DIR/assets/vendor-bootstrap/document.css" "$TARGET_DIR/document.css"
cp "$ROOT_DIR/assets/vendor-bootstrap/vue.2.6.11.min.js" "$TARGET_DIR/vue.2.6.11.min.js"
node "$ROOT_DIR/scripts/patch-eva-title-vendor.mjs" "$TARGET_DIR"
cp "$ROOT_DIR/assets/layout-help.png" "$TARGET_DIR/layout-help.png"

printf 'Rebuilt vendor/eva-title/html from itorr/eva-title@%s\n' "$UPSTREAM_REVISION"
