#! /usr/bin/env nix-shell
#! nix-shell -i bash -p curl gnused jq nix-prefetch-github nixfmt-rfc-style
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

update_src_hash() {
	local type="$1"
	local new_hash="$2"
	local prefix="${type}Hash"

	sed -i "/^[[:space:]]*${prefix}[[:space:]]*=[[:space:]]*\"sha256-[A-Za-z0-9+/=]\{1,\}\"/c\  ${prefix} = \"sha256-${new_hash}\";" "$ABS_NIX_FILE"

	if [ "$type" = "unstable" ]; then
		local new_rev
		new_rev=$(curl -s "https://api.github.com/repos/$OWNER/$REPO/commits/main" | jq -r .sha)
		sed -i "/^[[:space:]]*unstableRev[[:space:]]*=/c\  unstableRev = \"$new_rev\";" "$ABS_NIX_FILE"
	fi
}

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
	update_pnpm_deps "stable"

	new_version=$(curl -s "https://api.github.com/repos/$OWNER/$REPO/tags" |
		jq -r '.[] | select(.name | test("^v[0-9]+\\.[0-9]+\\.[0-9]+$")) | .name' |
		sort -Vr |
		head -1)

	if [[ ! "$new_version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
		echo "Error: Invalid stable version format: $new_version"
		exit 1
	fi

	clean_version="${new_version#v}"
	sed -i "/^[[:space:]]*stableVersion[[:space:]]*=/c\  stableVersion = \"${clean_version}\";" "$ABS_NIX_FILE"

	new_hash=$(nix-prefetch-github "$OWNER" "$REPO" --rev "$new_version" | jq -r .hash)
	update_src_hash "stable" "${new_hash#sha256-}"
else
	update_pnpm_deps "unstable"

	base_version=$(curl -s "https://api.github.com/repos/$OWNER/$REPO/tags" |
		jq -r '.[] | select(.name | test("^v[0-9]+\\.[0-9]+\\.[0-9]+$")) | .name' |
		sort -Vr |
		head -1 |
		sed 's/^v//')

	new_rev=$(curl -s "https://api.github.com/repos/$OWNER/$REPO/commits/main" | jq -r .sha)
	new_hash=$(nix-prefetch-github "$OWNER" "$REPO" --rev "$new_rev" | jq -r .hash)

	commit_date=$(curl -s "https://api.github.com/repos/$OWNER/$REPO/commits/$new_rev" | jq -r '.commit.committer.date | split("T")[0]')
	new_version="${base_version}-unstable-${commit_date}"

	sed -i "/^[[:space:]]*unstableVersion[[:space:]]*=/c\  unstableVersion = \"$new_version\";" "$ABS_NIX_FILE"
	update_src_hash "unstable" "${new_hash#sha256-}"
fi
