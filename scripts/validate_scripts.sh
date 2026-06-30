#!/usr/bin/env bash
set -euo pipefail
errors=0
while IFS= read -r -d '' script; do
  if ! bash -n "$script"; then
    echo "Syntax error in: $script"
    errors=$((errors + 1))
  fi
done < <(find scripts/ -name '*.sh' -print0)
if [ "$errors" -gt 0 ]; then
  echo "$errors script(s) failed syntax check"
  exit 1
fi
echo 'All shell scripts passed syntax check.'
