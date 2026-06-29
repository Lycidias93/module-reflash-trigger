# Module Reflash Trigger

Module Reflash Trigger (MRT) lists installed Magisk/KernelSU/APatch-compatible modules that declare `updateJson` and can safely lower the local `versionCode` of selected modules to re-enable manager-side online reflash/update.

## Safety model

MRT does **not** download, patch, modify, or redistribute third-party app payloads. It does **not** auto-install third-party module ZIPs. It only changes the local `module.prop` of already-installed modules, with backups, so the user's root/module manager can offer its normal online update/reflash flow again.

Public defaults are passive:

- boot auto-trigger is off
- auto-trigger is off
- ZIP HEAD fingerprinting is off
- the module refuses to trigger itself
- disabled/remove-marked modules are refused
- update-available/local-newer modules are not normally triggerable

## Action button

The Magisk/manager Action button runs:

```sh
mrt action
```

This triggers all modules that **their own `module.prop` currently reports as `Needs reflash`**. It is marker-only by default and does not trigger modules merely because of a baseline/fingerprint difference.

After action execution, close and reopen your root/module manager and run its normal online update/reflash for the triggered modules.

## CLI examples

```sh
mrt summary
mrt scan-online
mrt status-online youtube-morphe-jhc
mrt trigger-needed --dry-run --mode marker
mrt trigger-needed --yes --mode marker
mrt trigger-needed --dry-run --mode all
mrt mark-fresh youtube-morphe-jhc
mrt restore-latest youtube-morphe-jhc
mrt config-auto --disable
```

## Version

v0.1.1 / versionCode 10117

<!-- MRT_README_V010_EXPANDED_20260623_BEGIN -->
## What MRT does

Module Reflash Trigger helps with modules whose manager or module metadata reports that an online reflash is needed. It does this by safely lowering the local module `version` and `versionCode` in `module.prop`, so the root manager can offer its normal online update/reflash path again.

MRT does **not** download, verify, or install third-party module ZIP files. The actual reflash/update remains manager-side.

## Safety contract

- The module never triggers itself.
- Disabled or remove-marked modules are blocked.
- Local-newer-than-remote modules are not normally triggerable.
- The Action Button uses marker mode only.
- Marker mode triggers only modules that report a real `Needs reflash` marker.
- Diagnostic fingerprint drift is not enough for the default Action Button path.
- Boot auto-trigger is disabled by default.
- ZIP HEAD probing is disabled by default to avoid unstable remote fingerprint false positives.

## Quick start

1. Install the release ZIP in Magisk, KernelSU, or APatch-compatible manager.
2. Reboot.
3. Open the module Action Button to trigger modules that are currently marked as `Needs reflash`.
4. Return to your root manager and perform the offered online reflash/update there.

The Action Button only prepares the selected modules for manager-side reflash. It is expected that the root manager performs the final install/update step.

## CLI

The CLI is installed at:

```sh
/data/adb/modules/module-reflash-trigger/bin/mrt
```

Useful commands:

```sh
# Show module/runtime summary
mrt summary

# List updateJson-capable modules and their current status
mrt scan-online

# Dry-run the same marker-only path used by the Action Button
mrt trigger-needed --dry-run --mode marker

# Run the Action Button behavior from shell
mrt action

# Disable boot/auto behavior explicitly
mrt config-auto --disable
```

Depending on your shell context, run the command as root or through your manager shell, for example with `su -c`.

## Status meanings

| Status | Meaning | Default Action Button behavior |
|---|---|---|
|`fresh`|Remote fingerprint matches the stored fresh baseline.|Skipped.|
|`needs_reflash` with marker|The module/manager reports a real `Needs reflash` marker.|Triggerable.|
|`reflash_baseline_unknown`|No known fresh baseline exists yet.|Skipped by marker action mode.|
|`remote_fingerprint_changed_since_last_fresh`|Diagnostic drift from the stored baseline.|Skipped by marker action mode.|
|`local_newer_than_remote`|Installed local versionCode is higher than remote.|Skipped.|
|`blocked`|Self, disabled, remove-marked, or otherwise unsafe target.|Skipped.|

## Baselines

MRT can store a fresh baseline for modules after a known-good reflash/update. Baselines are used for diagnostics and status output. They are intentionally not the default Action Button trigger condition in v0.1.0.

## Runtime paths

- Module: `/data/adb/modules/module-reflash-trigger`
- Runtime data: `/data/adb/module-reflash-trigger`
- Backups: `/data/adb/module-reflash-trigger/backups`
- Config: `/data/adb/module-reflash-trigger/config.env`

## Troubleshooting

### Action Button triggers nothing

Run:

```sh
mrt trigger-needed --dry-run --mode marker
```

If `trigger_needed_dry_run_would_trigger=0`, MRT did not find any module that currently reports a real `Needs reflash` marker.

### A module shows fingerprint drift but is skipped

That is expected in v0.1.0. The default Action Button does not act on fingerprint drift alone, because remote metadata or ZIP headers can be unstable.

### A module was prepared but not updated

MRT only prepares the module by lowering `version`/`versionCode`. Open your root manager afterwards and perform the offered online reflash/update.

## Release integrity

Release v0.1.0 asset SHA256:

```text
b7dae60fc3630890a2b6fa1a526498d774e2d0a4c370b76d362c28222d7c9582  module-reflash-trigger-v0.1.0.zip
```

<!-- MRT_README_V010_EXPANDED_20260623_END -->

<!-- MRT_README_V011_RELEASE_20260630_BEGIN -->
## v0.1.1 release notes

- WebUI is included for scanning, status review, dry-runs, and safe trigger actions.
- Boot auto-trigger remains opt-in. The installer profile `[1] Morphe/ReVanced apps auto on boot` writes a strict allowlist for `music-morphe-jhc-arm64`, `reddit-morphe-jhc`, and `youtube-morphe-jhc` while excluding MRT itself and helper modules.
- The boot path replays only dry-run `needs_reflash` candidates from the configured allowlist and uses the existing trigger safety checks before force-gated `needs_reflash` handling.
- MRT still does not download or install third-party module ZIPs. It only prepares already-installed modules so the root/module manager can perform its normal online reflash/update.
- After a successful manager-side reflash/update, run `mrt mark-fresh <module-id>` for the refreshed module. This closes the remote baseline so the next boot dry-run returns zero.

### Verified dev16 release-candidate flow

```text
Boot auto-trigger detected 3 Morphe/ReVanced `needs_reflash` candidates.
MRT lowered their local `versionCode` to re-enable manager-side update/reflash.
The root manager restored real module versions.
`mrt mark-fresh` closed the baseline.
A final auto dry-run returned `auto_trigger_dry_run_would_trigger=0`.
```

### v0.1.1 release asset SHA256

```text
SHA256 is emitted by the release build log for `module-reflash-trigger-v0.1.1.zip`. No `.sha256` sidecar is published.
```
<!-- MRT_README_V011_RELEASE_20260630_END -->
