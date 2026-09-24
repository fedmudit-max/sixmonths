#!/usr/bin/env bash
# Ensure momentum-web-release.zip matches current source (not an old build).
# Usage: ./scripts/assert-release-fresh.sh [path/to/momentum-web-release.zip]

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP="${1:-${ROOT}/momentum-web-release.zip}"

if [[ ! -f "$ZIP" ]]; then
  echo "Release ZIP missing: $ZIP" >&2
  echo "Run: ./scripts/package-release.sh" >&2
  exit 1
fi

SRC_SW="${ROOT}/sw.js"
ZIP_SW="$(mktemp -t momentum-sw.XXXXXX)"
trap 'rm -f "$ZIP_SW"' EXIT
unzip -p "$ZIP" sw.js >"$ZIP_SW"

src_cache="$(grep -E '^const CACHE = ' "$SRC_SW" | head -1)"
zip_cache="$(grep -E '^const CACHE = ' "$ZIP_SW" | head -1)"

if [[ "$src_cache" != "$zip_cache" ]]; then
  echo "STALE RELEASE ZIP: service worker cache mismatch." >&2
  echo "  Source:  $src_cache" >&2
  echo "  In ZIP:  $zip_cache" >&2
  echo "Run ./scripts/package-release.sh and ship only that file." >&2
  exit 1
fi

MISMATCH=0
check_file() {
  local rel="$1"
  local src="${ROOT}/${rel}"
  local tmp
  tmp="$(mktemp -t momentum-cmp.XXXXXX)"
  if ! unzip -p "$ZIP" "$rel" >"$tmp" 2>/dev/null; then
    echo "Missing in ZIP: $rel" >&2
    rm -f "$tmp"
    MISMATCH=1
    return
  fi
  if ! cmp -s "$src" "$tmp"; then
    echo "Out of date in ZIP: $rel" >&2
    MISMATCH=1
  fi
  rm -f "$tmp"
}

check_file index.html
check_file manifest.json
check_file sw.js
check_file css/styles.css
for f in js/*.js; do
  check_file "${f#${ROOT}/}"
done

if [[ $MISMATCH -ne 0 ]]; then
  echo "Release ZIP does not match source. Run: ./scripts/package-release.sh" >&2
  exit 1
fi

echo "OK: Release ZIP matches source ($src_cache)."
