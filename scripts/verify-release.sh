#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
fail=0
check_file(){ [ -s "$1" ] || { echo "FAIL missing_or_empty $1"; fail=1; }; }
check_file module/module.prop
check_file module/bin/mrt
check_file module/customize.sh
check_file module/service.sh
check_file module/action.sh
check_file module/uninstall.sh
for f in module/bin/mrt module/customize.sh module/service.sh module/action.sh module/uninstall.sh scripts/build-release.sh scripts/verify-release.sh; do
  first="$(head -n 1 "$f")"
  [ "$first" = "#!/usr/bin/env bash" ] || [ "$first" = "#!/system/bin/sh" ] || { echo "FAIL shebang $f"; fail=1; }
  if LC_ALL=C grep -q $'\r' "$f"; then echo "FAIL crlf $f"; fail=1; fi
  case "$f" in
    *.sh|module/bin/mrt|module/action.sh|module/service.sh|module/uninstall.sh|module/customize.sh) chmod +x "$f" ;;
  esac
  case "$f" in
    scripts/*.sh) bash -n "$f" ;;
    module/bin/mrt|module/action.sh|module/service.sh|module/uninstall.sh) sh -n "$f" ;;
    module/customize.sh) sh -n "$f" ;;
  esac
done
python3 -m json.tool update.json >/dev/null
[ "$fail" -eq 0 ] || exit 1
echo "RESULT: MRT_VERIFY_RELEASE_PASS rc=0"
