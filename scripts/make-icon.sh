#!/usr/bin/env bash
# macOS-only: generate icon.icns from img/logo.png
# Usage: ./scripts/make-icon.sh
set -euo pipefail

SRC="img/logo.png"
OUT_DIR="img/icon.iconset"
OUT_ICNS="img/icon.icns"

if [ ! -f "$SRC" ]; then
  echo "Source image not found: $SRC"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# sizes required for macOS icns (filename format: icon_#x#.png)
sizes=(16 32 64 128 256 512 1024)
for s in "${sizes[@]}"; do
  sips -z $s $s "$SRC" --out "$OUT_DIR/icon_${s}x${s}.png" >/dev/null
done

# create the icns
iconutil -c icns "$OUT_DIR" -o "$OUT_ICNS"

# cleanup iconset
rm -rf "$OUT_DIR"

echo "Created $OUT_ICNS"
