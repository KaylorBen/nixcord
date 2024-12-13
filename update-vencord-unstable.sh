#! /usr/bin/env nix-shell
#! nix-shell -i bash -p jq gnused gnugrep nix-update
# shellcheck shell=bash

set -euo pipefail

cleanup() {
	if [ -f "temp-wrapper.nix" ]; then
		rm -f "temp-wrapper.nix"
	fi
}
trap cleanup EXIT

NIX_FILE="./vencord-unstable.nix"
ABS_NIX_FILE=$(realpath "$NIX_FILE")

if [ ! -f "$ABS_NIX_FILE" ]; then
	echo "Error: File $NIX_FILE does not exist"
	exit 1
fi

OWNER=$(grep 'owner = ' "$ABS_NIX_FILE" | sed -E 's/.*owner = "([^"]+)".*/\1/')
REPO=$(grep 'repo = ' "$ABS_NIX_FILE" | sed -E 's/.*repo = "([^"]+)".*/\1/' | tr -d '\n')

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
	echo "Error: Could not extract owner/repo from $ABS_NIX_FILE"
	exit 1
fi

echo "Updating $ABS_NIX_FILE for $OWNER/$REPO..."

cat >temp-wrapper.nix <<EOF
{ pkgs ? import <nixpkgs> {} }:
{
  ${REPO} = pkgs.callPackage ${ABS_NIX_FILE} {};
}
EOF

nix-update --version=branch \
	-f ./temp-wrapper.nix \
	--override-filename "$ABS_NIX_FILE" \
	"${REPO}"
