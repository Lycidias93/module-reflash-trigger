# Changelog

## v0.1.1 — complete changes since v0.1.0

Stable release for the verified WebUI and opt-in boot auto-trigger flow. This release keeps the public safety model from v0.1.0: MRT prepares already-installed modules for manager-side online reflash/update, but does not download, patch, redistribute, or install third-party module ZIPs.

### Added

- Add WebUI for module overview, status review, scan/dry-run, config visibility, and safe trigger actions.
- Add `mrt auto-trigger --dry-run` to show which configured modules would be prepared for manager-side reflash/update.
- Add `mrt auto-trigger --yes` for the boot/service path, replaying the same configured dry-run candidates instead of independently selecting targets.
- Add `mrt config-show` for inspecting runtime auto-trigger configuration.
- Add `mrt config-auto --profile morphe [--on-boot]` and `mrt config-auto --disable` for explicit profile setup and rollback.
- Add `mrt auto-ids morphe` to resolve the strict Morphe/ReVanced profile allowlist.
- Add installer option `[1] Morphe/ReVanced apps auto on boot`.
- Add runtime boot-auto logging under `/data/adb/module-reflash-trigger/logs/` for service start, config, dry-run replay, triggered targets, and errors.

### Changed

- Bump module version to `v0.1.1` and `versionCode=10117`.
- Update `update.json` so managers can discover `v0.1.1` online via the GitHub release asset.
- Include the final release ZIP as `dist/module-reflash-trigger-v0.1.1.zip`.
- Keep release distribution ZIP-only; no `.sha256` sidecar is published.
- Preserve the existing v0.1.0 Action Button behavior: marker-only and manager-reported `Needs reflash` targets only.
- Keep boot auto-trigger opt-in. Public defaults remain passive unless the user explicitly selects/enables an auto profile.
- Rework the boot auto-trigger implementation so it uses configured allowlist + status/dry-run replay rather than broad scanning.
- Force-gate only verified `needs_reflash` candidates during boot replay, so the root manager can offer its normal online update/reflash afterwards.
- Clear stale boot error output before new boot-auto runs to avoid old failures being mistaken for current failures.

### Safety and target guards

- MRT still refuses to trigger itself.
- Disabled and remove-marked modules remain blocked.
- Helper/self-like modules such as MRT itself and `rvmm-zygisk-mount` are excluded from the Morphe/ReVanced profile.
- Local-newer/update-available states are not force-triggered by the boot profile.
- The `[1] Morphe/ReVanced apps auto on boot` installer profile writes a strict allowlist for:
  - `music-morphe-jhc-arm64`
  - `reddit-morphe-jhc`
  - `youtube-morphe-jhc`
- Boot auto-trigger prepares only already-installed allowlisted modules; actual install/update remains manager-side.

### Verified release-candidate flow

- Verified on Pixel with `v0.1.1-dev16`, then carried into final `v0.1.1`.
- Boot auto-trigger detected three Morphe/ReVanced `needs_reflash` candidates.
- MRT lowered their local `version`/`versionCode` to `0.0.0-reflash-trigger` / `1` to make the root manager offer normal online reflash/update again.
- The root manager restored the real Morphe module versions.
- `mrt mark-fresh <module-id>` closed the remote baseline after successful manager-side reflash.
- Final dry-run returned `auto_trigger_dry_run_would_trigger=0`.
- Final `v0.1.1` install/reboot verify showed fresh baselines and no new boot-auto errors.

### Operator notes

- After MRT prepares a module, close and reopen the root/module manager and run the offered online update/reflash there.
- After a successful manager-side reflash/update, run `mrt mark-fresh <module-id>` for the refreshed module.
- If `mrt auto-trigger --dry-run` reports `auto_trigger_dry_run_would_trigger=0`, boot auto-trigger has no pending work.
- If a target shows `update_available`, the manager already sees a normal update/reflash opportunity; MRT should not lower it again.

### Release asset

```text
a6d4b355efceb93da4450990e5da775f7be4767f1c292bbd4c9616e7c33ddb5a  module-reflash-trigger-v0.1.1.zip
```

## v0.1.0

- Add `mrt action` for the Magisk/manager Action button.
- Action button triggers all manager-reported `Needs reflash` modules in marker-only mode.
- Add `mrt trigger-needed --dry-run|--yes --mode marker|all`.
- WebUI adds `Needs reflash dry-run` and `Trigger Needs reflash` buttons.
- Keep public-safe behavior: no third-party ZIP auto-download or auto-install.

## v0.1.0-dev6

- Detect manager-visible `Needs reflash` markers in module descriptions.
