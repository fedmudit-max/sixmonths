#!/usr/bin/env bash
# Fail if a ZIP is not a clean Momentum web deploy artifact.
# Usage: ./scripts/verify-release-zip.sh path/to/file.zip

set -euo pipefail
ZIP="${1:?Usage: $0 file.zip}"
if [[ ! -f "$ZIP" ]]; then
  echo "Not found: $ZIP" >&2
  exit 1
fi

ALLOWED_RE='^(index\.html|manifest\.json|sw\.js|css/|js/|icons/)'
BAD_RE='(^\.git/|^\.github/|__MACOSX|\.DS_Store|^scripts/|^dist/|/\.git/|momentum-web-release\.zip$|\.zip$)'

entries=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  entries+=("$line")
done < <(unzip -Z1 "$ZIP" 2>/dev/null | sed '/^$/d')

if [[ ${#entries[@]} -eq 0 ]]; then
  echo "ZIP is empty or unreadable: $ZIP" >&2
  exit 1
fi

bad=()
for e in "${entries[@]}"; do
  if [[ "$e" =~ $BAD_RE ]]; then
    bad+=("$e")
    continue
  fi
  if [[ ! "$e" =~ $ALLOWED_RE ]]; then
    bad+=("$e")
  fi
done

if [[ ${#bad[@]} -gt 0 ]]; then
  echo "Invalid production ZIP ($ZIP). Disallowed entries:" >&2
  printf '  %s\n' "${bad[@]}" >&2
  echo "Production must contain only: index.html, manifest.json, sw.js, css/, js/, icons/" >&2
  echo "Build with: ./scripts/package-release.sh (do not zip the dev repo in Finder)." >&2
  exit 1
fi

echo "OK: ${#entries[@]} entries — clean Momentum web deploy package."
