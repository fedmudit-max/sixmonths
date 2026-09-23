#!/usr/bin/env bash
# Copy only files that belong in production (web host / release ZIP).
# Usage: ./scripts/stage-web-deploy.sh <empty-target-directory>

set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <target-directory>" >&2
  exit 1
fi
TARGET="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$TARGET"
cp "${ROOT}/index.html" "${ROOT}/manifest.json" "${ROOT}/sw.js" "$TARGET/"
cp -R "${ROOT}/css" "${ROOT}/js" "${ROOT}/icons" "$TARGET/"
find "$TARGET" -name '.DS_Store' -delete 2>/dev/null || true
find "$TARGET" -name '__MACOSX' -type d -prune -exec rm -rf {} + 2>/dev/null || true
