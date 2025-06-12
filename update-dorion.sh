#! /usr/bin/env nix-shell
#! nix-shell -i bash -p nix coreutils
# shellcheck shell=bash

set -euo pipefail

if [[ "${1:-}" =~ ^(-h|--help)$ ]]; then
  echo "Usage: $0 [path/to/dorion.nix]"
  exit 0
fi

DORION_NIX="${1:-./dorion.nix}"
ABS_DORION_NIX="$(realpath "$DORION_NIX")"

echo "Building updateScript from $ABS_DORION_NIX..."
UPDATE_OUT_PATH=$(nix build --impure --print-out-paths --expr \
  "let pkgs = import <nixpkgs> {}; in (pkgs.callPackage \"$ABS_DORION_NIX\" {}).passthru.updateScript")

if [[ ! -d "$UPDATE_OUT_PATH" ]]; then
  echo "Error: Failed to build updateScript derivation."
  exit 1
fi

SCRIPT_PATH="$UPDATE_OUT_PATH/bin/dorion-update"

if [[ ! -x "$SCRIPT_PATH" ]]; then
  echo "Error: Update script not found or is not executable: $SCRIPT_PATH"
  exit 1
fi

SCRIPT_DIR="$(dirname "$ABS_DORION_NIX")"
echo "Running update script in $SCRIPT_DIR ..."
cd "$SCRIPT_DIR"
"$SCRIPT_PATH"
