# MRT design

MRT is a trigger tool, not an installer. The root/module manager remains responsible for downloading and installing update ZIPs from each module's `updateJson`.

The public Action button uses marker-only mode:

1. scan installed updateJson-capable modules
2. select modules whose `module.prop` description contains a manager-visible `Needs reflash` marker
3. lower local `version` and `versionCode`
4. keep backups under `/data/adb/module-reflash-trigger/backups`
5. ask the user to reopen the manager and run normal online reflash/update

Fingerprint-based `needs_reflash` is still available for CLI diagnostics and explicit auto-trigger allowlists, but is not the Action button default.
