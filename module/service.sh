#!/system/bin/sh
# Module Reflash Trigger boot service
# MRT_BOOT_AUTO_V011_DEV11: run configured auto-trigger after boot with durable logs.

MODDIR="${0%/*}"
MRT="$MODDIR/bin/mrt"
RT="/data/adb/module-reflash-trigger"
CONFIG="$RT/config.env"
LOGDIR="$RT/logs"
LOG="$LOGDIR/boot-auto.log"
ERR="$LOGDIR/boot-auto.err"
SERVICE_LOG="$LOGDIR/service.log"

mkdir -p "$LOGDIR"

mrt_ts() {
  date '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || date
}

mrt_log() {
  echo "$(mrt_ts) $*" >> "$SERVICE_LOG"
}

mrt_boot_auto() {
  mkdir -p "$LOGDIR"
  mrt_log "service_start version=v0.1.1 moddir=$MODDIR"

  # Let Magisk/root manager finish module activation and network settle.
  sleep 60

  if [ ! -x "$MRT" ]; then
    mrt_log "auto_trigger_skip reason=mrt_not_executable path=$MRT"
    return 0
  fi

  if [ ! -f "$CONFIG" ]; then
    mrt_log "auto_trigger_skip reason=config_missing path=$CONFIG"
    return 0
  fi

  . "$CONFIG" 2>>"$ERR" || true

  enabled="${MRT_AUTO_TRIGGER_ENABLED:-0}"
  on_boot="${MRT_AUTO_TRIGGER_ON_BOOT:-0}"
  ids="${MRT_AUTO_TRIGGER_MODULE_IDS:-}"
  profile="${MRT_AUTO_TRIGGER_PROFILE:-}"

  mrt_log "auto_trigger_config enabled=$enabled on_boot=$on_boot profile=$profile ids=$ids"

  if [ "$enabled" != "1" ] || [ "$on_boot" != "1" ]; then
    mrt_log "auto_trigger_skip reason=disabled enabled=$enabled on_boot=$on_boot"
    return 0
  fi

  : > "$ERR"
  {
    echo "== boot auto trigger =="
    mrt_ts
    echo "version=v0.1.1"
    echo "enabled=$enabled"
    echo "on_boot=$on_boot"
    echo "profile=$profile"
    echo "ids=$ids"
    echo
    "$MRT" auto-trigger --yes
  } >> "$LOG" 2>> "$ERR"
  rc=$?
  mrt_log "auto_trigger_done rc=$rc"
  return 0
}

mrt_boot_auto &
exit 0
