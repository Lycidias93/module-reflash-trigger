#!/system/bin/sh
# Module Reflash Trigger background hook.
# Defaults are intentionally passive. It only scans if explicitly enabled.
MODDIR=${0%/*}
RUNTIME="/data/adb/module-reflash-trigger"
LOG="$RUNTIME/logs/service.log"
mkdir -p "$RUNTIME/logs" "$RUNTIME/state" 2>/dev/null || true
(
  sleep 60
  [ -r "$RUNTIME/config.env" ] && . "$RUNTIME/config.env"
  if [ "${MRT_BOOT_AUTOSCAN:-0}" = "1" ]; then
    "$MODDIR/bin/mrt" scan-online
  fi
  if [ "${MRT_AUTO_TRIGGER_ON_BOOT:-0}" = "1" ] && [ "${MRT_AUTO_TRIGGER_ENABLED:-0}" = "1" ]; then
    "$MODDIR/bin/mrt" auto-trigger --yes
  fi
) >> "$LOG" 2>&1 &
