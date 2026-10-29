#!/bin/bash
set -euo pipefail
cd -- "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if command -v node >/dev/null 2>&1; then exec node scripts/uninstall-wizard.cjs "$@"; fi
[ "$(uname -s)" = Darwin ] && [ -f .lemmata-install.json ] || { echo 'Node is unavailable. Keep the installation record for manual cleanup.';exit 1; }
id=$(/usr/bin/plutil -extract id raw -o - .lemmata-install.json)
[[ "$id" =~ ^[a-f0-9-]{36}$ ]] || exit 1
folder="$HOME/.local/share/Lemmata/toolchains/$id/node"
[ -f "$folder/.lemmata-owner" ] && [ "$(cat "$folder/.lemmata-owner")" = "$id" ] && [ ! -L "$folder" ] || exit 1
exec "$folder/runtime/bin/node" scripts/uninstall-wizard.cjs "$@"
