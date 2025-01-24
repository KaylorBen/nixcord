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

# Create a wrapper that calls the package with the appropriate unstable flag
cat >temp-wrapper.nix <<EOF
{ pkgs ? import <nixpkgs> {} }:
{
  ${REPO} = pkgs.callPackage ${ABS_NIX_FILE} { unstable = $([[ "$UPDATE_TYPE" == "unstable" ]] && echo "true" || echo "false"); };
}
EOF

update_hash() {
	local type="$1"
	local new_hash="$2"
	local prefix="${type}PnpmDeps"

	sed -i "/^[[:space:]]*${prefix}[[:space:]]*=[[:space:]]*\"sha256-[A-Za-z0-9+/=]\{1,\}\"/c\  ${prefix} = \"sha256-${new_hash}\";" "$ABS_NIX_FILE"
}

update_pnpm_deps() {
	local type="$1"
	echo "Checking ${type}pnpmDeps"

	local is_unstable
	is_unstable=$([[ "$type" == "unstable" ]] && echo "true" || echo "false")

	if nix-build --pure \
		--expr "with import (builtins.getFlake \"nixpkgs\") {}; (callPackage ${ABS_NIX_FILE} { unstable = ${is_unstable}; }).pnpmDeps" \
		--no-link &>/dev/null; then
		echo "${type}pnpmDeps hash is already correct"
		return 0
	fi

	echo "Current hash invalid. Calculating new pnpmDeps hash for ${type}..."

	local build_output
	build_output=$(nix-build --pure \
		--expr "with import (builtins.getFlake \"nixpkgs\") {}; (callPackage ${ABS_NIX_FILE} { unstable = ${is_unstable}; }).pnpmDeps" \
		--no-link 2>&1 || true)

	local new_hash
	new_hash=$(echo "$build_output" | grep -oP 'got:\s+sha256-\K[A-Za-z0-9+/]*=' || true)

	if [ -n "$new_hash" ]; then
		update_hash "$type" "$new_hash"
		echo "Updated ${type} pnpmDeps hash"

		if nix-build --pure \
			--expr "with import (builtins.getFlake \"nixpkgs\") {}; (callPackage ${ABS_NIX_FILE} { unstable = ${is_unstable}; }).pnpmDeps" \
			--no-link &>/dev/null; then
			echo "Verification successful - new hash works"
			return 0
		else
			echo "Error: New hash verification failed"
			return 1
		fi
	else
		echo "Failed to extract new pnpmDeps hash"
		return 1
	fi
}

if [ "$UPDATE_TYPE" = "stable" ]; then
	# For stable versions, we're getting latest tag and update
	update_pnpm_deps "stable"
	if ! nix-update --version-regex 'v(.*)' \
		--url "https://github.com/$OWNER/$REPO" \
		--format \
		-f ./temp-wrapper.nix \
		--override-filename "$ABS_NIX_FILE" \
		"${REPO}"; then
		echo "Failed to update stable version, updating pnpm deps..."
	fi
else
	# For unstable versions, we're just using branch update
	update_pnpm_deps "unstable"
	if ! nix-update --version=branch \
		--url "https://github.com/$OWNER/$REPO" \
		--format \
		-f ./temp-wrapper.nix \
		--override-filename "$ABS_NIX_FILE" \
		"${REPO}"; then
		echo "Failed to update unstable version, updating pnpm deps..."
	fi
fi
