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

v0.1.0 / versionCode 16
