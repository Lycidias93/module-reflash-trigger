#!/system/bin/sh
# Module Reflash Trigger installer
SKIPUNZIP=0
ui_print "- Module Reflash Trigger"
ui_print "- CLI: /data/adb/modules/module-reflash-trigger/bin/mrt"
ui_print "- Default: no automatic module.prop changes"
RUNTIME="/data/adb/module-reflash-trigger"
mkdir -p "$RUNTIME/backups" "$RUNTIME/state" "$RUNTIME/logs" "$RUNTIME/state/remote" "$RUNTIME/state/fresh" "$RUNTIME/state/pending"
if [ ! -f "$RUNTIME/config.env" ]; then
  cat > "$RUNTIME/config.env" <<'EOF'
# Module Reflash Trigger config
# Public-safe defaults: scan only, no automatic module.prop changes.
MRT_BOOT_AUTOSCAN=0
MRT_AUTO_TRIGGER_ON_BOOT=0
MRT_AUTO_TRIGGER_ENABLED=0
# Space separated allowlist. Empty means no module is auto-triggerable.
MRT_AUTO_TRIGGER_MODULE_IDS=""
# Treat modules without a fresh baseline as needs-reflash. Unsafe for public defaults.
MRT_AUTO_BASELINE_UNKNOWN=0
# Include HEAD metadata of zipUrl in remote fingerprint if curl/wget supports it.
MRT_USE_ZIP_HEAD=0
EOF
fi
set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm "$MODPATH/bin/mrt" 0 0 0755
set_perm "$MODPATH/action.sh" 0 0 0755
set_perm "$MODPATH/service.sh" 0 0 0755
set_perm "$MODPATH/uninstall.sh" 0 0 0755
