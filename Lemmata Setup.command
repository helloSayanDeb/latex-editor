#!/bin/bash
cd -- "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)" || exit 1
exec /bin/bash ./setup.sh "$@"
