#!/usr/bin/env bash
set -euo pipefail

OPENWRT_VERSION="${OPENWRT_VERSION:-25.12.4}"
TARGET="${TARGET:-mediatek}"
SUBTARGET="${SUBTARGET:-filogic}"
SDK_NAME="openwrt-sdk-${OPENWRT_VERSION}-${TARGET}-${SUBTARGET}_gcc-14.3.0_musl.Linux-x86_64.tar.zst"
SDK_URL="https://downloads.openwrt.org/releases/${OPENWRT_VERSION}/targets/${TARGET}/${SUBTARGET}/${SDK_NAME}"
SDK_SHA256="411a2277ca10f909c30275a506aab4dc28a4f1281d7fda4f19faaa2ded6630bb"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR="$ROOT_DIR/build"
SDK_ARCHIVE="$WORK_DIR/$SDK_NAME"
SDK_DIR="$WORK_DIR/sdk"
PACKAGE_NAME="luci-app-huawei-hilink-status"
RESULT_DIR="$ROOT_DIR/result"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  command -v sudo >/dev/null 2>&1 || {
    echo "Error: run as root or install sudo." >&2
    exit 1
  }
  SUDO="sudo"
fi

$SUDO apt-get update
$SUDO apt-get install -y \
  build-essential clang flex bison g++ gawk gcc-multilib gettext git \
  libncurses-dev libssl-dev python3-setuptools rsync swig unzip \
  zlib1g-dev file wget curl zstd

mkdir -p "$WORK_DIR"

if [ ! -f "$SDK_ARCHIVE" ]; then
  echo "Downloading OpenWrt SDK ${OPENWRT_VERSION} for ${TARGET}/${SUBTARGET}..."
  curl -L --fail --retry 5 --output "$SDK_ARCHIVE" "$SDK_URL"
fi

echo "$SDK_SHA256  $SDK_ARCHIVE" | sha256sum -c -

if [ ! -d "$SDK_DIR" ]; then
  mkdir -p "$SDK_DIR"
  tar --zstd -xf "$SDK_ARCHIVE" -C "$SDK_DIR" --strip-components=1
fi

rm -rf "$SDK_DIR/package/$PACKAGE_NAME"
mkdir -p "$SDK_DIR/package/$PACKAGE_NAME"
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude 'build/' \
  --exclude 'result/' \
  "$ROOT_DIR/" "$SDK_DIR/package/$PACKAGE_NAME/"

cd "$SDK_DIR"

./scripts/feeds update -a
./scripts/feeds install -a

make defconfig
make "package/$PACKAGE_NAME/clean" V=s
make "package/$PACKAGE_NAME/compile" V=s -j"$(nproc)"

rm -rf "$RESULT_DIR"
mkdir -p "$RESULT_DIR"

find "$SDK_DIR/bin" -type f -name "${PACKAGE_NAME}-*.apk" -exec cp -v {} "$RESULT_DIR/" \;

APK_FILE="$(find "$RESULT_DIR" -maxdepth 1 -type f -name '*.apk' | head -n 1 || true)"
if [ -z "$APK_FILE" ]; then
  echo "Error: built APK was not found." >&2
  exit 1
fi

(
  cd "$RESULT_DIR"
  sha256sum "$(basename "$APK_FILE")" > SHA256SUMS
)

echo
echo "Build complete:"
echo "$APK_FILE"
echo
echo "Install on OpenWrt 25.12+:"
echo "apk add --allow-untrusted /tmp/$(basename "$APK_FILE")"
