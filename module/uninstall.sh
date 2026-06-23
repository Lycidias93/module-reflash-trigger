#!/system/bin/sh
RUNTIME="/data/adb/module-reflash-trigger"
# Keep backups by default. User can remove manually after confirming no rollback is needed.
mkdir -p "$RUNTIME" 2>/dev/null || true
cat > "$RUNTIME/UNINSTALLED_KEEPING_BACKUPS.txt" <<'EOF'
Module Reflash Trigger was uninstalled.
Backups and state were intentionally kept under /data/adb/module-reflash-trigger.
Remove that directory manually only after confirming no restore is needed.
EOF
