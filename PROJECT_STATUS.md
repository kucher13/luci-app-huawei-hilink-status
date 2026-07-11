# Project status

Last updated: 2026-07-11

## Current release

- Stable release: `v1.0.0`
- Package version: `1.0.0-r1`
- Package name: `luci-app-huawei-hilink-status`
- License: MIT
- Release status: successful

The published v1.0.0 package checksum recorded by the repository is:

```text
c5e0de54bb0ecb78e341cae76eea250c1f5530b5082277b260a86017fa1d8a0e
```

## Current state

The project is functional and has a public v1.0.0 release.

The LuCI dashboard currently provides:

- RSSI, RSRP, RSRQ, and SINR signal metrics
- operator and network information
- connection, service, roaming, WAN, and internet health state
- current session traffic and connection time
- total and monthly traffic counters
- download and upload rate history
- signal history with selectable time ranges
- ping and DNS health checks
- LTE reconnect control
- mobile data on/off control
- manual refresh
- automatic Russian and English UI selection based on LuCI language

The project does not include telemetry or analytics.

## Tested environment

The currently documented tested environment is:

- OpenWrt `25.12.4`
- target `mediatek/filogic`
- `apk` package manager
- Huawei HiLink modem reachable at `192.168.8.1`

Compatibility with every Huawei HiLink modem and firmware version is not yet verified.

## Package and build state

The OpenWrt package definition is in `Makefile`.

Current runtime dependencies are:

- `luci-base`
- `rpcd-mod-file`
- `curl`

`build-on-ubuntu.sh` downloads the matching OpenWrt SDK, installs feeds, builds the APK, and writes:

```text
result/luci-app-huawei-hilink-status-*.apk
result/SHA256SUMS
```

GitHub Actions builds the package on relevant source changes and uploads the APK and checksum as workflow artifacts.

The current release publishing workflow still contains v1.0.0-specific logic and needs to be generalized before the next normal versioned release.

## Current architecture

### Backend

`files/usr/bin/huawei`

The shell backend:

- talks to the local Huawei HiLink HTTP/XML API
- obtains Huawei session and verification tokens
- reads device, status, signal, operator, traffic, and monthly statistics endpoints
- converts the collected values into JSON for LuCI
- checks internet connectivity with ping and DNS tests
- stores temporary history in `/tmp/huawei-lte-history.tsv`
- supports the `HUAWEI_BASE` environment variable for direct command-line testing

### LuCI frontend

`files/www/luci-static/resources/view/huawei/lte_clean.js.gz`

The current LuCI view is stored compressed in the repository and is decompressed by the package build into `lte_clean.js`.

This works for packaging, but it is not an ideal source-maintenance format. Moving to an uncompressed JavaScript source of truth is a planned maintenance task.

### LuCI integration

- menu registration: `files/usr/share/luci/menu.d/luci-app-huawei-lte.json`
- rpcd ACL: `files/usr/share/rpcd/acl.d/luci-app-huawei-lte.json`

## Current limitations and technical debt

### Fixed modem address in the packaged LuCI flow

The packaged interface currently expects the modem at:

```text
http://192.168.8.1
```

The backend supports `HUAWEI_BASE` for direct testing, but a persistent modem-address setting is not exposed in LuCI.

### Temporary history only

History is stored in:

```text
/tmp/huawei-lte-history.tsv
```

It is temporary and is lost after reboot. The backend limits the file to the latest 2160 rows.

Any future persistent-history design must avoid excessive writes to OpenWrt flash.

### Huawei API variability

Huawei HiLink XML responses and endpoints vary by modem model and firmware.

The current parser handles the known tested flow, but broader compatibility still needs structured testing and diagnostics.

### Release automation is version-specific

The GitHub Actions workflow currently publishes or updates `v1.0.0` for main-branch builds and uses the tag name only for tag-triggered builds.

Before the next release, release version handling should be derived from package metadata or the pushed tag and should not be hardcoded to v1.0.0.

### Compressed LuCI source in the repository

The LuCI JavaScript view is currently committed only as a gzip file.

This makes review, diffing, and agent-assisted maintenance harder than necessary.

## Current focus

The next maintenance phase should prepare the repository for continued development after v1.0.0 without changing stable user behavior unnecessarily.

Priority order:

1. make the uncompressed LuCI JavaScript file the source of truth
2. generalize version and release automation
3. add lightweight validation for shell, gzip, package structure, and frontend source
4. add a persistent LuCI setting for the Huawei modem address
5. improve compatibility diagnostics for different HiLink firmware variants

See `ROADMAP.md` for the planned version sequence.

## Last completed work

- published the successful v1.0.0 release
- added reproducible Ubuntu/OpenWrt SDK build tooling
- added GitHub Actions APK build and release handling
- expanded installation and diagnostic documentation
- added full-resolution dashboard screenshots
- fixed GitHub Actions status reporting
- added project instructions, project status, roadmap, and changelog files for agent-assisted development

## Known critical regressions

No confirmed critical regression is currently recorded in this repository.

This statement does not mean all Huawei modem or firmware combinations have been tested.
