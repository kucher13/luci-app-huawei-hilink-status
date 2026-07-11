# Agent instructions

## Project

`luci-app-huawei-hilink-status` is an OpenWrt LuCI application for Huawei HiLink LTE modems.

The current stable release is `v1.0.0` / package version `1.0.0-r1`.

The project provides a local LuCI dashboard for signal metrics, operator and connection state, traffic statistics, connection health, history, and basic modem controls.

## Read before changing anything

Read these files first:

1. `PROJECT_STATUS.md`
2. `ROADMAP.md`
3. `CHANGELOG.md`
4. `README.md`
5. `Makefile`
6. `build-on-ubuntu.sh`

Then inspect the files related to the requested change.

Do not start by rewriting working code.

## Current architecture

- `files/usr/bin/huawei` is the shell backend and Huawei HiLink API client.
- `files/www/luci-static/resources/view/huawei/lte_clean.js.gz` contains the compressed LuCI JavaScript view.
- `files/usr/share/luci/menu.d/luci-app-huawei-lte.json` registers the LuCI menu entry.
- `files/usr/share/rpcd/acl.d/luci-app-huawei-lte.json` contains rpcd permissions.
- `Makefile` defines the OpenWrt package.
- `build-on-ubuntu.sh` performs a reproducible SDK build and writes APK output to `result/`.
- `.github/workflows/build.yml` builds the package in GitHub Actions.

The package build decompresses `lte_clean.js.gz` and installs it as `lte_clean.js`.

## Project priorities

In order of importance:

1. Preserve working modem connectivity and controls.
2. Preserve correct signal, traffic, and connection data.
3. Keep the LuCI interface stable, simple, responsive, and bilingual.
4. Maintain OpenWrt package correctness.
5. Avoid unnecessary dependencies and background services.
6. Improve compatibility without breaking the tested setup.
7. Keep releases reproducible and understandable.

## Working rules

- Inspect the current implementation before editing.
- Make the smallest complete change that solves the task.
- Do not silently remove working features.
- Do not rewrite large sections only for style.
- Do not introduce telemetry, analytics, or external tracking.
- Keep modem data local unless a feature explicitly requires an external health check.
- Preserve Russian and English interface behavior.
- Preserve the `HUAWEI_BASE` environment override for direct backend testing.
- Treat Huawei API responses as model- and firmware-dependent.
- Handle missing XML fields and unavailable API endpoints gracefully.
- Avoid persistent high-frequency writes to router flash.
- Avoid adding large runtime dependencies.
- Never commit files from `build/` or `result/`.

## LuCI view changes

The repository currently stores the LuCI view as:

`files/www/luci-static/resources/view/huawei/lte_clean.js.gz`

When changing the UI:

1. Decompress the file to a temporary regular `.js` working file.
2. Make and review the JavaScript changes there.
3. Check syntax before recompressing.
4. Recompress deterministically with `gzip -n`.
5. Verify that `gzip -t` succeeds.
6. Review the final repository diff.

Do not edit compressed binary data blindly.

A future roadmap item is to keep an uncompressed JavaScript source file in the repository as the source of truth.

## Backend changes

For `files/usr/bin/huawei`:

- Keep POSIX/OpenWrt shell compatibility in mind.
- Quote shell variables unless intentional word splitting is required.
- Preserve connection and request timeouts.
- Preserve meaningful error output.
- Test API-unavailable behavior as well as successful responses.
- Do not assume every Huawei firmware exposes every endpoint or XML field.
- Keep JSON output valid when values are missing.

## Package and build changes

Before considering package-related work complete, verify:

- `PKG_VERSION` and `PKG_RELEASE` are intentional.
- dependencies in `Makefile` match runtime usage.
- installed paths are correct.
- menu and rpcd ACL files are still included.
- the build script still finds the resulting APK.
- `SHA256SUMS` generation still works.
- documentation does not claim support that has not been tested.

The currently documented default build target is OpenWrt `25.12.4`, `mediatek/filogic`.

## Validation

Use the checks relevant to the change.

Recommended minimum checks:

```sh
sh -n files/usr/bin/huawei
bash -n build-on-ubuntu.sh

gzip -t files/www/luci-static/resources/view/huawei/lte_clean.js.gz
```

For a UI change, decompress the LuCI JavaScript view and perform a JavaScript syntax check with an available local tool before recompressing.

For package or release changes, run the complete build when practical:

```sh
chmod +x build-on-ubuntu.sh
./build-on-ubuntu.sh
```

Expected output:

```text
result/luci-app-huawei-hilink-status-*.apk
result/SHA256SUMS
```

When access to a tested OpenWrt router and Huawei HiLink modem is available, also verify:

```sh
/usr/bin/huawei json
curl -s --connect-timeout 3 http://192.168.8.1/api/device/information
```

Then open the LuCI page and verify the affected behavior manually.

## Completion requirements

Before declaring a task complete:

1. Review the final diff.
2. Run the relevant syntax and integrity checks.
3. State exactly what changed.
4. State what was actually tested.
5. State any remaining limitation or unverified assumption.
6. Update `PROJECT_STATUS.md` after significant project changes.
7. Update `ROADMAP.md` when priorities or planned versions change.
8. Update `CHANGELOG.md` for user-visible changes.
9. Update `README.md` when installation, compatibility, configuration, or public behavior changes.

Do not report a feature as tested on hardware unless it was actually tested on hardware.
