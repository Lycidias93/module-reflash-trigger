#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
version="$(awk -F= '$1=="version"{print $2}' module/module.prop)"
zip_name="module-reflash-trigger-${version}.zip"
out_dir="$repo_root/dist"
rm -rf "$out_dir"
mkdir -p "$out_dir"
( cd module && zip -r9 "$out_dir/$zip_name" . -x '*.DS_Store' )
sha256sum "$out_dir/$zip_name" > "$out_dir/$zip_name.sha256"
echo "built=$out_dir/$zip_name"
echo "RESULT: MRT_BUILD_RELEASE_DONE rc=0"
