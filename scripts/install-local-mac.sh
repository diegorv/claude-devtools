#!/usr/bin/env bash
# Build claude-devtools for this Mac and install it to /Applications.
#
# - Never publishes (--publish never), never notarizes
# - Ad-hoc signed (no Developer ID needed); runs only on the machine that built it
#
# Usage: scripts/install-local-mac.sh

set -euo pipefail

APP_NAME="claude-devtools"
INSTALL_PATH="/Applications/${APP_NAME}.app"

cd "$(dirname "$0")/.."

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script only supports macOS." >&2
  exit 1
fi

# Use mise-pinned Node/pnpm when available
run() {
  if command -v mise >/dev/null 2>&1; then
    mise exec -- "$@"
  else
    "$@"
  fi
}

case "$(uname -m)" in
  arm64) ARCH="arm64"; OUT_DIR="release/mac-arm64" ;;
  x86_64) ARCH="x64"; OUT_DIR="release/mac" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

APP_PATH="${OUT_DIR}/${APP_NAME}.app"

echo "==> Building (${ARCH})"
run pnpm build
rm -rf release
CSC_IDENTITY_AUTO_DISCOVERY=false run npx electron-builder \
  --mac --"${ARCH}" --dir \
  --publish never \
  -c.mac.notarize=false

echo "==> Ad-hoc signing"
codesign --force --deep --sign - "${APP_PATH}"
codesign --verify --deep --strict "${APP_PATH}"

if pgrep -f "${INSTALL_PATH}/Contents/MacOS/" >/dev/null; then
  echo "==> Quitting running ${APP_NAME}"
  osascript -e "quit app \"${APP_NAME}\"" || true
  for _ in {1..10}; do
    pgrep -f "${INSTALL_PATH}/Contents/MacOS/" >/dev/null || break
    sleep 1
  done
fi

echo "==> Installing to ${INSTALL_PATH}"
rm -rf "${INSTALL_PATH}"
ditto "${APP_PATH}" "${INSTALL_PATH}"
codesign --verify --deep --strict "${INSTALL_PATH}"

echo "==> Launching"
open "${INSTALL_PATH}"
