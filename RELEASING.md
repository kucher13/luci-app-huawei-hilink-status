# Release procedure

This document describes the release procedure for `luci-app-huawei-hilink-status`.

## Safety rules

- A normal push to `main` validates and builds the package but never publishes a GitHub Release.
- A GitHub Release is created only by pushing a tag whose name matches `v*`.
- The pushed tag must equal `v${PKG_VERSION}`, where `PKG_VERSION` is read from `Makefile`.
- The workflow refuses to modify a GitHub Release that already exists.
- Never reuse an already published version tag for a different build or commit.
- Published release assets are immutable. Do not replace an APK or `SHA256SUMS` after publication.
- Any correction after publication must use a new package version and a new version tag.

## Prepare the release

1. Verify that the working tree is clean before switching branches or pulling:

   ```sh
   git status --short
   git switch main
   git pull --ff-only origin main
   git status --short
   ```

   Both `git status --short` checks must produce no output.

2. Choose the new version and update `PKG_VERSION` in `Makefile`.

3. Review `PKG_RELEASE` deliberately. For a new package version it normally remains or is reset to `1`. Do not change it mechanically.

4. Update `CHANGELOG.md` with the changes included in the release.

5. Update `PROJECT_STATUS.md` with the factual package and release state. Do not describe the release as published before the tag workflow succeeds.

6. Update `ROADMAP.md` only when the plan or the status of a planned version has changed.

7. Update `README.md` when installation commands, compatibility information, configuration, or user-visible behavior has changed.

8. Review and run the relevant local checks, including:

   ```sh
   sh -n files/usr/bin/huawei
   bash -n build-on-ubuntu.sh
   node --check files/www/luci-static/resources/view/huawei/lte_clean.js
   python3 -m json.tool files/usr/share/luci/menu.d/luci-app-huawei-lte.json >/dev/null
   python3 -m json.tool files/usr/share/rpcd/acl.d/luci-app-huawei-lte.json >/dev/null
   git diff --check
   git status --short
   ```

9. Create a release-preparation commit and record its full commit SHA:

   ```sh
   git add Makefile CHANGELOG.md PROJECT_STATUS.md ROADMAP.md README.md
   git commit -m "Prepare vX.Y.Z release"
   RELEASE_COMMIT="$(git rev-parse HEAD)"
   ```

   Stage only files that were intentionally changed; omit unchanged documentation from `git add`.

## Validate the release commit

1. Push `main`:

   ```sh
   git push origin main
   ```

2. Wait for the GitHub Actions workflow for `RELEASE_COMMIT` to finish. Both `validation` and `build` must succeed. `publish` must be skipped for the normal `main` push.

3. Download and inspect the GitHub Actions artifact created by that run. Confirm that it contains exactly the expected APK and `SHA256SUMS`.

4. Verify again that `Makefile` at `RELEASE_COMMIT` contains the intended version:

   ```sh
   git show "${RELEASE_COMMIT}:Makefile" | grep '^PKG_VERSION:='
   ```

## Create and publish the version tag

1. Read `PKG_VERSION` from the release commit and construct the only permitted tag name:

   ```sh
   PKG_VERSION="$(git show "${RELEASE_COMMIT}:Makefile" | awk -F':=' '$1 == "PKG_VERSION" { print $2; exit }')"
   RELEASE_TAG="v${PKG_VERSION}"
   test -n "$PKG_VERSION"
   ```

2. Confirm that the tag and GitHub Release do not already exist. Stop if either already exists:

   ```sh
   test -z "$(git tag --list "$RELEASE_TAG")"
   test -z "$(git ls-remote --tags origin "refs/tags/${RELEASE_TAG}")"
   ! gh release view "$RELEASE_TAG"
   ```

   Also check the GitHub Releases page. Treat authentication or network errors as blocking failures, not as proof that the release is absent.

3. Create the tag on the exact release-preparation commit and verify its target:

   ```sh
   git tag -a "$RELEASE_TAG" "$RELEASE_COMMIT" -m "Release ${RELEASE_TAG}"
   test "$(git rev-parse "${RELEASE_TAG}^{commit}")" = "$RELEASE_COMMIT"
   ```

4. Push only that tag:

   ```sh
   git push origin "$RELEASE_TAG"
   ```

## Verify the published release

1. Wait for the tag workflow to finish. Both `validation` and `build` must succeed, followed by a successful `publish` job.

2. Confirm that `publish` created a new GitHub Release for `RELEASE_TAG`. It must not update an older release.

3. Confirm that the release contains the expected APK and `SHA256SUMS`.

4. Download both release assets into an empty directory and verify the checksum:

   ```sh
   sha256sum -c SHA256SUMS
   ```

5. Confirm that the published tag points to `RELEASE_COMMIT` and that the GitHub Release uses that tag:

   ```sh
   git fetch origin "refs/tags/${RELEASE_TAG}:refs/tags/${RELEASE_TAG}"
   test "$(git rev-parse "${RELEASE_TAG}^{commit}")" = "$RELEASE_COMMIT"
   gh release view "$RELEASE_TAG" --json tagName,targetCommitish,url
   ```

6. Only after all checks succeed, update project documentation that intentionally records the release as published.

## Example

For a future `1.0.1` package release:

```make
PKG_VERSION:=1.0.1
```

The corresponding tag must be:

```text
v1.0.1
```

This is an example only. It does not mean that `v1.0.1` has been created or published.
