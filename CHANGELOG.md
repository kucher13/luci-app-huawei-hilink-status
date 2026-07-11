# Changelog

All notable user-visible changes to this project are recorded here.

## Unreleased

### Maintenance

- Made the uncompressed LuCI JavaScript view the repository source of truth.
- Updated package installation to install the LuCI JavaScript view directly from `lte_clean.js`.
- Removed the obsolete compressed `lte_clean.js.gz` frontend file.
- Restricted GitHub Release publication to pushed version tags matching `PKG_VERSION`.
- Added lightweight GitHub Actions validation before the OpenWrt SDK build.
- Added `RELEASING.md` with the safe version preparation, tagging, publication, and verification procedure.
- Added `AGENTS.md` with project-specific instructions for coding agents.
- Added `PROJECT_STATUS.md` as the factual current-state reference for the project.
- Added `ROADMAP.md` with planned development stages after v1.0.0.
- Updated GitHub Actions path filters so project documentation changes do not trigger unnecessary APK builds.

These maintenance changes do not intentionally change package runtime behavior.

## v1.0.0 — 2026-07-10

Initial stable public release.

### Added

- Huawei HiLink LTE dashboard integrated into LuCI.
- RSSI, RSRP, RSRQ, and SINR signal metrics.
- Operator and network information.
- Connection, service, roaming, WAN, and internet health information.
- Current session traffic statistics and connection time.
- Total traffic counters.
- Monthly traffic counters.
- Download and upload speed history.
- Signal history with selectable time range.
- Ping and DNS health checks.
- LTE reconnect control.
- Mobile data on/off control.
- Manual dashboard refresh.
- Automatic Russian interface for Russian LuCI locale and English interface for other LuCI locales.
- Local Huawei HiLink HTTP/XML API backend.
- Session and request-verification token handling for Huawei API requests.
- Temporary history storage in `/tmp/huawei-lte-history.tsv`.
- `HUAWEI_BASE` environment override for direct backend testing.
- OpenWrt package definition for `luci-app-huawei-hilink-status`.
- LuCI menu registration and rpcd ACL.
- Reproducible Ubuntu/OpenWrt SDK build script.
- SHA-256 checksum generation for built APK files.
- GitHub Actions APK build and release workflow.
- Public installation, upgrade, uninstall, and diagnostic documentation.
- Full-resolution dashboard screenshots in the README.

### Package

- Version: `1.0.0-r1`
- Documented tested OpenWrt version: `25.12.4`
- Documented tested target: `mediatek/filogic`
- Package manager: `apk`

### Known limitations at release

- The packaged LuCI flow expects the Huawei HiLink modem at `192.168.8.1`.
- Persistent modem-address configuration is not exposed in LuCI.
- History is stored in `/tmp` and is lost after reboot.
- Huawei API compatibility varies by modem model and firmware.
- The repository stores the LuCI JavaScript view as a compressed gzip file.
