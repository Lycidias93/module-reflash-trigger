# Changelog

## v0.1.1

- Add WebUI for module status, dry-run, and safe trigger actions.
- Add installer-selectable Morphe/ReVanced auto profile with strict allowlist and explicit opt-in boot auto-trigger.
- Add force-gated boot auto-trigger replay for selected `needs_reflash` candidates only.
- Keep public safety contract: MRT does not download or install third-party ZIPs; the root manager performs the actual online reflash/update.
- Document required post-manager-reflash baseline closure with `mrt mark-fresh <module-id>`.


## v0.1.0

- Add `mrt action` for the Magisk/manager Action button.
- Action button triggers all manager-reported `Needs reflash` modules in marker-only mode.
- Add `mrt trigger-needed --dry-run|--yes --mode marker|all`.
- WebUI adds `Needs reflash dry-run` and `Trigger Needs reflash` buttons.
- Keep public-safe behavior: no third-party ZIP auto-download or auto-install.

## v0.1.0-dev6

- Detect manager-visible `Needs reflash` markers in module descriptions.
