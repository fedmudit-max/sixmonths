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

echo "Created ${OUT}"
echo "Deploy this file only — never ship the dev folder or GitHub \"Download ZIP\" of the repo."
