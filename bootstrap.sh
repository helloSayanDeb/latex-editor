#!/bin/bash
set -euo pipefail
parent="$HOME/Applications"
[ "$(uname -s)" = Darwin ] || parent="$HOME/.local/share"
destination="${LEMMATA_INSTALL_DIRECTORY:-$parent/Lemmata}"
[ ! -e "$destination" ] || { echo "Folder exists: $destination. Use its Lemmata Setup.command.";exit 1; }
case "$destination" in "$HOME"|/|"") echo 'Choose a dedicated installation folder';exit 1 ;; esac
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
curl --fail --location --proto '=https' https://api.github.com/repos/helloSayanDeb/latex-editor/commits/main -o "$work/commit.json"
if [ "$(uname -s)" = Darwin ]; then
 revision=$(/usr/bin/plutil -extract sha raw -o - "$work/commit.json")
else
 revision=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).sha)' "$work/commit.json")
fi
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid repository revision';exit 1; }
curl --fail --location --proto '=https' "https://codeload.github.com/helloSayanDeb/latex-editor/zip/$revision" -o "$work/source.zip"
unzip -q "$work/source.zip" -d "$work/extract"
source="$work/extract/latex-editor-$revision"
[ -f "$source/scripts/setup-wizard.cjs" ] || { echo 'Publish the current setup wizard before using this bootstrap.';exit 1; }
mkdir -p -- "$(dirname "$destination")"
mv -- "$source" "$destination"
chmod +x "$destination/setup.sh" "$destination/Lemmata Setup.command" "$destination/Lemmata Uninstall.command"
cd -- "$destination"
rm -rf -- "$work"
trap - EXIT
exec /bin/bash ./setup.sh
