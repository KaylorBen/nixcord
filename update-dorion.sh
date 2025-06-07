#! /usr/bin/env nix-shell
#! nix-shell -i bash -p curl jq nix-prefetch cacert perl --pure
# shellcheck shell=bash

set -euo pipefail

if [[ "${1:-}" =~ ^(-h|--help)$ ]]; then
  echo "Usage: $0 [path/to/dorion.nix]"
  exit 0
fi

DORION_NIX="${1:-./dorion.nix}"
ABS_DORION_NIX="$(realpath "$DORION_NIX")"

if [[ ! -f "$ABS_DORION_NIX" ]]; then
  echo "Error: File $DORION_NIX does not exist"
  exit 1
fi

OWNER="SpikeHD"
REPO="Dorion"

echo "Fetching latest Dorion version from GitHub..."

LATEST_VERSION=$(curl -s "https://api.github.com/repos/$OWNER/$REPO/releases/latest" | jq -r .tag_name)
if [[ -z "$LATEST_VERSION" || "$LATEST_VERSION" == "null" ]]; then
  echo "Error: Failed to fetch latest version"
  exit 1
fi

CLEAN_VERSION="${LATEST_VERSION#v}"

echo "Latest version: $CLEAN_VERSION"

CURRENT_VERSION=$(perl -ne 'print $1 if /^\s*version\s*=\s*"([^"]+)";/' "$ABS_DORION_NIX")
echo "Current version: $CURRENT_VERSION"

if [[ "$CLEAN_VERSION" == "$CURRENT_VERSION" ]]; then
  echo "Already up to date"
  exit 0
fi

echo "Updating from $CURRENT_VERSION to $CLEAN_VERSION"

sed -i "/^\s*version\s*=\s*\"[^\"]*\";/s/\(version\s*=\s*\"\)[^\"]*\(\";.*\)/\1$CLEAN_VERSION\2/" "$ABS_DORION_NIX"

declare -A platforms=(
  ["x86_64-darwin"]="Dorion_${CLEAN_VERSION}_x64.dmg"
  ["aarch64-darwin"]="Dorion_${CLEAN_VERSION}_aarch64.dmg"
  ["x86_64-linux"]="Dorion_${CLEAN_VERSION}-1.x86_64.rpm"
  ["aarch64-linux"]="Dorion_${CLEAN_VERSION}_arm64.deb"
)

for platform in "${!platforms[@]}"; do
  filename="${platforms[$platform]}"
  url="https://github.com/$OWNER/$REPO/releases/download/v${CLEAN_VERSION}/${filename}"
  
  echo "Updating hash for $platform ($filename)..."
  
  if ! new_hash=$(nix-prefetch fetchurl --url "$url" 2>/dev/null) || [[ -z "$new_hash" ]]; then
    echo "Warning: Failed to fetch hash for $platform, skipping..."
    continue
  fi
  
  sri_hash="sha256-$(nix hash to-sri --type sha256 "$new_hash" 2>/dev/null | cut -d- -f2-)"
  
  perl -i -pe "
    BEGIN { \$in_platform = 0; }
    if (/^\s*\"$platform\"\s*=\s*\{/) { \$in_platform = 1; next; }
    if (\$in_platform && /^\s*\}/) { \$in_platform = 0; next; }
    if (\$in_platform && /^\s*hash\s*=\s*\"sha256-[A-Za-z0-9+\/=]*\"\s*;/) {
      s/(^\s*hash\s*=\s*\").*(\"\s*;)/\1$sri_hash\2/;
      \$in_platform = 0;
    }
  " "$ABS_DORION_NIX"
  
  echo "Updated $platform hash to: $sri_hash"
done

echo "Dorion update completed successfully!"
