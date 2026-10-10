#!/bin/sh
# macOS: downloads a published desktop app, verifies it, installs for this user.
set -eu
if [ "$(uname -s)" != Darwin ]; then
  echo 'This installer supports macOS. Linux users can use setup.sh from the repository.' >&2
  exit 1
fi
case "$(uname -m)" in arm64) arch=arm64 ;; x86_64) arch=x64 ;; *) echo 'Unsupported architecture' >&2; exit 1 ;; esac
asset="TeXStudio-Local-mac-$arch.dmg"
base='https://github.com/helloSayanDeb/latex-editor/releases/latest/download'
work=$(mktemp -d)
mount="$work/mount"
trap 'hdiutil detach "$mount" >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
curl -fL "$base/$asset" -o "$work/$asset"
curl -fL "$base/SHA256SUMS.txt" -o "$work/SHA256SUMS.txt"
expected=$(awk -v asset="$asset" '$2 == asset {print $1}' "$work/SHA256SUMS.txt")
actual=$(shasum -a 256 "$work/$asset" | awk '{print $1}')
[ -n "$expected" ] && [ "$expected" = "$actual" ] || { echo 'Checksum verification failed' >&2; exit 1; }
hdiutil attach "$work/$asset" -nobrowse -mountpoint "$mount"
mkdir -p "$HOME/Applications"
ditto "$mount/TeXStudio Local.app" "$HOME/Applications/TeXStudio Local.app"
open "$HOME/Applications/TeXStudio Local.app"
echo 'Installed. macOS may require approving this unsigned app in Privacy & Security. Install MacTeX for compilation.'
