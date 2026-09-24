#!/usr/bin/env bash
# Production deploy ZIP — NOT the dev repo.
#
# Wrong: zipping the project folder in Finder (includes .git/, scripts/, dist/, …).
# Right:  ./scripts/package-release.sh
#         Upload ONLY the printed momentum-web-release.zip

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d 2>/dev/null || mktemp -d -t momentum-release)"
OUT="${ROOT}/momentum-web-release.zip"
trap 'rm -rf "$STAGE"' EXIT

"${ROOT}/scripts/stage-web-deploy.sh" "$STAGE"

rm -f "$OUT"
(
  cd "$STAGE"
  zip -r "$OUT" . -x "*.DS_Store" -x "*/.DS_Store" -x "*__MACOSX*" -x "*__MACOSX/*"
)

"${ROOT}/scripts/verify-release-zip.sh" "$OUT"
"${ROOT}/scripts/assert-release-fresh.sh" "$OUT"

echo "Created ${OUT}"
echo "Service worker: $(grep -E '^const CACHE = ' "${ROOT}/sw.js" | head -1)"
echo ""
echo "IMPORTANT:"
echo "  • Upload ONLY this file for production / Android web assets."
echo "  • Do NOT zip the dev repo (no .git, scripts/, or nested old zips)."
echo "  • Re-run this script after every source change before shipping."
