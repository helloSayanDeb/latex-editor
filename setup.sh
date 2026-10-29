#!/usr/bin/env bash
set -euo pipefail
cd -- "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# Reuse this checkout's private runtime without changing the system PATH permanently.
if [ -f .lemmata-install.json ] && [ "$(uname -s)" = Darwin ]; then
  id=$(/usr/bin/plutil -extract id raw -o - .lemmata-install.json)
  [[ "$id" =~ ^[a-f0-9-]{36}$ ]] || exit 1
  runtime="$HOME/.local/share/Lemmata/toolchains/$id/node/runtime/bin/node"
  owner="$HOME/.local/share/Lemmata/toolchains/$id/node/.lemmata-owner"
  if [ -x "$runtime" ] && [ -f "$owner" ] && [ "$(cat "$owner")" = "$id" ]; then export PATH="$(dirname "$runtime"):$PATH"; fi
fi
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0])>=22?0:1)'; then
  [ "$(uname -s)" = Darwin ] || { echo 'Install Node.js 22+ and retry.' >&2; exit 1; }
  printf 'Download a private Node.js runtime for Lemmata (system tools unchanged)? [y/N] '
  read -r answer
  case "$answer" in y|Y|yes|YES) ;; *) exit 1 ;; esac
  if [ -f .lemmata-install.json ]; then id=$(/usr/bin/plutil -extract id raw -o - .lemmata-install.json); else id=$(uuidgen | tr '[:upper:]' '[:lower:]'); fi
  [[ "$id" =~ ^[a-f0-9-]{36}$ ]] || exit 1
  target="$HOME/.local/share/Lemmata/toolchains/$id/node"
  [ ! -e "$target" ] || exit 1
  mkdir -p "$target";printf '%s' "$id" > "$target/.lemmata-owner"
  /usr/bin/osascript -l JavaScript scripts/setup-record.jxa "$PWD" "$id" "$target" installing
  curl --fail --location --proto '=https' https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$target/sums"
  asset=$(awk '$2 ~ /^node-v24[.].*-darwin-arm64[.]tar[.]gz$/ {print $2;exit}' "$target/sums")
  case "$asset" in node-v24.*-darwin-arm64.tar.gz) ;; *) echo 'Official archive unavailable';exit 1 ;; esac
  curl --fail --location --proto '=https' "https://nodejs.org/dist/latest-v24.x/$asset" -o "$target/node.tar.gz"
  expected=$(awk -v file="$asset" '$2==file {print $1}' "$target/sums")
  actual=$(shasum -a 256 "$target/node.tar.gz" | awk '{print $1}')
  [ "$actual" = "$expected" ] || { echo 'Node checksum mismatch';exit 1; }
  mkdir "$target/runtime";tar -xzf "$target/node.tar.gz" -C "$target/runtime" --strip-components=1
  export PATH="$target/runtime/bin:$PATH"
  /usr/bin/osascript -l JavaScript scripts/setup-record.jxa "$PWD" "$id" "$target" installed
  rm -f -- "$target/node.tar.gz" "$target/sums"
fi
exec node scripts/setup-wizard.cjs "$@"
