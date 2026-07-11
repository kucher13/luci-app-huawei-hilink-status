# Roadmap

This roadmap describes the intended development sequence after the stable `v1.0.0` release.

The order may change when real modem compatibility reports or regressions require higher priority work.

## v1.0.1 — Repository and release maintenance

Goal: make continued development safer without changing stable dashboard behavior.

Planned:

- document the release procedure
- keep current v1.0.0 user-facing behavior unchanged unless a confirmed bug must be fixed

Completed in the current development branch:

- kept an uncompressed LuCI JavaScript source file in the repository as the source of truth
- updated package build logic to install that source file directly
- removed the obsolete compressed LuCI JavaScript file
- generalized GitHub Actions release handling so ordinary main-branch pushes never publish releases
- added a tag and `PKG_VERSION` consistency check before GitHub Release publication
- added lightweight CI validation for required files, shell scripts, frontend JavaScript, and LuCI JSON files

Release criteria:

- existing package still builds successfully
- lightweight validation passes before the OpenWrt SDK build
- no dashboard feature is intentionally removed
- release automation publishes only from matching version tags
- repository source is easier to review and modify

## v1.1.0 — Configurable Huawei modem address

Goal: remove the fixed `192.168.8.1` assumption from normal LuCI usage.

Planned:

- add persistent UCI configuration for the Huawei HiLink base address
- add a simple LuCI settings flow for the modem address
- keep `HUAWEI_BASE` as a direct command-line override for diagnostics and testing
- make the backend consistently use the configured base address
- validate address input and show a useful error when the modem is unreachable
- document non-default Huawei HiLink subnets

Release criteria:

- default behavior still works with `192.168.8.1`
- a different reachable HiLink address can be configured without editing source files
- invalid or unreachable addresses fail gracefully
- upgrade from v1.0.x preserves working default behavior

## v1.2.0 — History and data retention improvements

Goal: make signal and speed history more useful while protecting router flash.

Planned:

- review current 2160-row temporary history behavior
- introduce explicit history retention settings
- allow temporary RAM-only history to remain the safe default
- investigate optional persistent history with controlled write frequency
- avoid high-frequency writes to internal flash
- improve history reset and diagnostics behavior
- document storage and flash-wear tradeoffs

Possible additions after testing:

- export selected history data
- configurable sampling interval
- clearer empty-history and reboot-reset states

Release criteria:

- RAM-only mode remains available
- persistent history, if added, is opt-in or otherwise designed to minimize flash wear
- retention limits are enforced
- dashboard remains responsive on OpenWrt hardware

## v1.3.0 — Huawei HiLink compatibility and diagnostics

Goal: support more HiLink modem and firmware variants predictably.

Planned:

- add a structured compatibility-report template
- improve diagnostics for missing or changed API endpoints
- distinguish unavailable fields from real zero values
- improve XML parsing resilience where practical
- identify firmware-specific endpoint differences
- add a documented tested-device and firmware compatibility matrix
- keep unsupported endpoints from breaking the complete dashboard

Possible additions:

- backend diagnostic command with sanitized capability information
- API capability detection
- compatibility adapters for known Huawei API variants

Release criteria:

- missing optional API fields do not break the whole JSON response
- compatibility reports contain enough information to reproduce issues
- supported device and firmware claims are backed by actual reports or hardware tests

## v1.4.0 — Dashboard polish and operational controls

Goal: improve daily use after the configuration and compatibility foundations are stable.

Potential work:

- clearer degraded-state indicators
- better modem-unreachable and internet-unavailable messages
- improved mobile layout where needed
- safer confirmation for disruptive modem controls
- clearer refresh and last-update states
- optional advanced diagnostics section without cluttering the default dashboard

Release criteria:

- no regression in the current responsive dark LuCI layout
- Russian and English interface behavior remains consistent
- operational controls remain clear and safe

## v2.0.0 — Architecture review

Goal: consider larger changes only after the 1.x line is stable and compatibility data exists.

Candidates for evaluation, not promises:

- cleaner backend/frontend data contract
- multi-modem architecture
- modular Huawei API compatibility layers
- broader OpenWrt target and release testing
- a package structure closer to long-term upstream distribution expectations

A v2.0.0 change may break internal implementation compatibility, but migration for users should be documented and deliberate.

## Not planned as default behavior

The following should not be introduced casually:

- project telemetry or analytics
- cloud dependency for local modem data
- continuous high-frequency writes to router flash
- large runtime frameworks or unnecessary daemons
- unsupported compatibility claims without evidence

## Roadmap update rule

After significant work:

- move completed user-visible changes into `CHANGELOG.md`
- update `PROJECT_STATUS.md` with the current factual state
- update this roadmap only when priorities, version scope, or release criteria have changed
