#!/bin/bash
set -e
here="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$here/bootstrap.sh" ]; then exec /bin/bash "$here/bootstrap.sh"; fi
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
curl --fail --location --proto '=https' https://raw.githubusercontent.com/helloSayanDeb/latex-editor/main/bootstrap.sh -o "$work/bootstrap.sh"
/bin/bash "$work/bootstrap.sh"
