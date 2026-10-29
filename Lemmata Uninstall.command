#!/bin/bash
cd -- "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)" || exit 1
exec bash ./uninstall.sh "$@"
