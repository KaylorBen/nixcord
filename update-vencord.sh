#! /usr/bin/env nix-shell
#! nix-shell -i bash -p jq curl gnused nix-update nixfmt-rfc-style
# shellcheck shell=bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
	echo "Usage: $0 <stable|unstable> <path-to-nix-file>"
	exit 1
fi

UPDATE_TYPE="$1"
NIX_FILE="$2"
ABS_NIX_FILE=$(realpath "$NIX_FILE")

if [ ! -f "$ABS_NIX_FILE" ]; then
	echo "Error: File $NIX_FILE does not exist"
	exit 1
fi

cleanup() {
	if [ -f "temp-wrapper.nix" ]; then
		rm -f "temp-wrapper.nix"
	fi
}
trap cleanup EXIT

OWNER="Vendicated"
REPO="Vencord"

echo "Updating $ABS_NIX_FILE for $OWNER/$REPO ($UPDATE_TYPE)..."

# Create a wrapper that calls the package with the appropriate unstable flag
cat >temp-wrapper.nix <<EOF
{ pkgs ? import <nixpkgs> {} }:
{
  ${REPO} = pkgs.callPackage ${ABS_NIX_FILE} { unstable = $([[ "$UPDATE_TYPE" == "unstable" ]] && echo "true" || echo "false"); };
}
EOF

if [ "$UPDATE_TYPE" = "stable" ]; then
	# For stable versions, we're getting latest tag and update
	echo "Fetching latest stable version..."
	if ! nix-update --version-regex 'v(.*)' \
		--url "https://github.com/$OWNER/$REPO" \
		--format \
		-f ./temp-wrapper.nix \
		--override-filename "$ABS_NIX_FILE" \
		"${REPO}"; then
		echo "Failed to update stable version"
		exit 1
	fi
else
	# For unstable versions, we're just using branch update
	echo "Fetching latest unstable version..."
	if ! nix-update --version=branch \
		--url "https://github.com/$OWNER/$REPO" \
		--format \
		-f ./temp-wrapper.nix \
		--override-filename "$ABS_NIX_FILE" \
		"${REPO}"; then
		echo "Failed to update unstable version"
		exit 1
	fi
fi
