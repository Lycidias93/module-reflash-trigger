#!/system/bin/sh
# Module Reflash Trigger installer
SKIPUNZIP=0
ui_print() { echo "$@"; }
ui_print "- Module Reflash Trigger"
ui_print "- CLI: /data/adb/modules/module-reflash-trigger/bin/mrt"
ui_print "- Installer auto mode can be selected with volume keys"
RUNTIME="/data/adb/module-reflash-trigger"
mkdir -p "$RUNTIME/backups" "$RUNTIME/state" "$RUNTIME/logs" "$RUNTIME/state/remote" "$RUNTIME/state/fresh" "$RUNTIME/state/pending" "$RUNTIME/webui"

mrt_prop_get() {
  key="$1"; file_path="$2"
  awk -v k="$key" 'BEGIN{FS="="} $1==k {sub(/^[^=]*=/,"",$0); print; exit}' "$file_path" 2>/dev/null || true
}

mrt_morphe_ids() {
  for prop in /data/adb/modules/*/module.prop; do
    [ -f "$prop" ] || continue
    id="$(mrt_prop_get id "$prop")"
    [ -n "$id" ] || id="$(basename "$(dirname "$prop")")"
    updateJson="$(mrt_prop_get updateJson "$prop")"
    [ -n "$updateJson" ] || continue
    blob="$(printf '%s\n%s\n%s\n%s\n' "$id" "$(mrt_prop_get name "$prop")" "$(mrt_prop_get description "$prop")" "$updateJson" | tr '[:upper:]' '[:lower:]')"
    case "$id $blob" in module-reflash-trigger*|*module-reflash-trigger*|*module\ reflash\ trigger*|*rvmm*|*zygisk-mount*|*zygisk_mount*|*mounts\ the\ rvmm*|*mounts-the-rvmm*) continue ;; esac
    case "$blob" in *morphe*|*revanced-magisk-module*|*revanced*|*j-hc/revanced*) printf '%s\n' "$id" ;; esac
  done | sort
}

mrt_write_config_passive() {
  cat > "$RUNTIME/config.env" <<'EOF'
# Module Reflash Trigger config
# Public-safe defaults: scan only, no automatic module.prop changes.
MRT_BOOT_AUTOSCAN=0
MRT_AUTO_TRIGGER_ON_BOOT=0
MRT_AUTO_TRIGGER_ENABLED=0
MRT_AUTO_TRIGGER_MODULE_IDS=""
MRT_AUTO_TRIGGER_PROFILE=""
MRT_AUTO_BASELINE_UNKNOWN=0
MRT_USE_ZIP_HEAD=0
EOF
  ui_print "- Auto mode: disabled"
}

mrt_write_config_morphe() {
  on_boot="$1"
  ids="$(mrt_morphe_ids | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  cat > "$RUNTIME/config.env" <<EOF
# Module Reflash Trigger config
# Installer-selected strict Morphe/ReVanced app auto profile; self/rvmm/helper modules excluded.
MRT_BOOT_AUTOSCAN=0
MRT_AUTO_TRIGGER_ON_BOOT=$on_boot
MRT_AUTO_TRIGGER_ENABLED=1
MRT_AUTO_TRIGGER_MODULE_IDS="$ids"
MRT_AUTO_TRIGGER_PROFILE="morphe"
MRT_AUTO_BASELINE_UNKNOWN=0
MRT_USE_ZIP_HEAD=0
EOF
  ui_print "- Auto mode: Morphe/ReVanced app profile enabled"
  ui_print "- Auto on boot: $on_boot"
  ui_print "- Matched IDs: ${ids:-none yet; profile still active}"
}

mrt_keycheck() {
  # return 0 for Vol+, 1 for Vol-. Fallback selects current/default.
  if ! command -v getevent >/dev/null 2>&1; then
    return 1
  fi
  while true; do
    line="$(getevent -qlc 1 2>/dev/null | grep -E 'KEY_VOLUME(UP|DOWN).*DOWN' || true)"
    case "$line" in
      *KEY_VOLUMEUP*) return 0 ;;
      *KEY_VOLUMEDOWN*) return 1 ;;
    esac
  done
}

mrt_choose_auto_mode() {
  idx=0
  labels0="Passive/off"
  labels1="Morphe/ReVanced apps auto on boot"
  labels2="Morphe/ReVanced apps profile, manual/WebUI only"
  ui_print ""
  ui_print "- Auto mode setup"
  ui_print "  Vol+ cycles, Vol- selects"
  ui_print "  Safe default is Passive/off."
  while true; do
    case "$idx" in
      0) label="$labels0" ;;
      1) label="$labels1" ;;
      2) label="$labels2" ;;
      *) idx=0; label="$labels0" ;;
    esac
    ui_print "  Current: [$idx] $label"
    if mrt_keycheck; then
      idx=$(( (idx + 1) % 3 ))
    else
      break
    fi
  done
  case "$idx" in
    1) mrt_write_config_morphe 1 ;;
    2) mrt_write_config_morphe 0 ;;
    *) mrt_write_config_passive ;;
  esac
}

if [ ! -f "$RUNTIME/config.env" ]; then
  mrt_write_config_passive
fi
mrt_choose_auto_mode

set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm "$MODPATH/bin/mrt" 0 0 0755
set_perm "$MODPATH/action.sh" 0 0 0755
set_perm "$MODPATH/service.sh" 0 0 0755
set_perm "$MODPATH/uninstall.sh" 0 0 0755
