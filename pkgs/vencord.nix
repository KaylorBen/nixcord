# Made from nixpkgs pkg and updated with nix-update
# identical to nixpkgs source, but maintained here for
# quicker updates that don't wait on hydra

{
  fetchFromGitHub,
  gitMinimal,
  lib,
  nodejs_22,
  stdenv,
  buildWebExtension ? false,
  unstable ? false,
  pnpm_10,
  writeShellApplication,
  cacert,
  coreutils,
  curl,
  jq,
  nix,
  nix-prefetch-github,
  perl,
}:

let
  stableVersion = "1.13.1";
  stableHash = "sha256-FqRRpsS1NPpxJr6iaDvQJ3fuX07oo08lZ6f+oEQb3MM=";
  stablePnpmDeps = "sha256-JP9HOaP3DG+2F89tC77JZFD0ls35u/MzxNmvMCbBo9Y=";

  unstableVersion = "1.13.1-unstable-2025-10-02";
  unstableRev = "467da909d60a11c9e3b896e5943a10c6e2ff408f";
  unstableHash = "sha256-FqRRpsS1NPpxJr6iaDvQJ3fuX07oo08lZ6f+oEQb3MM=";
  unstablePnpmDeps = "sha256-JP9HOaP3DG+2F89tC77JZFD0ls35u/MzxNmvMCbBo9Y=";
in
stdenv.mkDerivation (finalAttrs: {
  pname = "vencord" + lib.optionalString unstable "-unstable";
  version = if unstable then unstableVersion else stableVersion;

  src = fetchFromGitHub {
    owner = "Vendicated";
    repo = "Vencord";
    rev = if unstable then unstableRev else "v${finalAttrs.version}";
    hash = if unstable then unstableHash else stableHash;
  };

  pnpmDeps = pnpm_10.fetchDeps {
    inherit (finalAttrs) pname src;
    hash = if unstable then unstablePnpmDeps else stablePnpmDeps;
    fetcherVersion = 2;
  };

  nativeBuildInputs = [
    gitMinimal
    nodejs_22
    pnpm_10.configHook
  ];

  env = {
    VENCORD_REMOTE = "${finalAttrs.src.owner}/${finalAttrs.src.repo}";
    VENCORD_HASH = "${finalAttrs.version}";
  };

  buildPhase = ''
    runHook preBuild
    pnpm run ${if buildWebExtension then "buildWeb" else "build"} \
      -- --standalone --disable-updater
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    cp -r dist/${lib.optionalString buildWebExtension "chromium-unpacked/"} "$out"
    cp package.json "$out"
    runHook postInstall
  '';

  passthru.updateScript = writeShellApplication {
    name = "vencord-update";
    runtimeInputs = [
      cacert
      coreutils
      curl
      jq
      nix
      nix-prefetch-github
      perl
    ];
    text = ''
      NIX_FILE="./pkgs/vencord.nix"
      UPDATE_TYPE="${if unstable then "unstable" else "stable"}"
      UPDATE_BOOL="${if unstable then "true" else "false"}"

      if [[ ! -f "$NIX_FILE" ]]; then
        echo "Error: File $NIX_FILE does not exist"
        exit 1
      fi

      backup_file="$NIX_FILE.backup.$(date +%s)"
      cp "$NIX_FILE" "$backup_file"
      echo "Created backup: $backup_file"

      cleanup() {
        local exit_code=$?
        if [[ $exit_code -ne 0 && -f "$backup_file" ]]; then
          echo "Restoring backup due to error..." >&2
          cp "$backup_file" "$NIX_FILE"
        fi
        rm -f "$backup_file"
        exit $exit_code
      }
      trap cleanup EXIT

      update_value_perl() {
        local var_name="$1"
        local new_value="$2"
        VAR_NAME="$var_name" NEW_VALUE="$new_value" \
        perl -i -pe '
          my $var_name = $ENV{"VAR_NAME"};
          my $new_value = $ENV{"NEW_VALUE"};
          if (/^(\s*)''${var_name}(\s*=\s*")[^"]*(";\s*)$/) {
            $_ = "$1''${var_name}$2''${new_value}$3";
          }
        ' "$NIX_FILE"
      }

      update_source_hash() {
        local rev="$1"
        local prefix="$2"
        echo "Fetching source hash..."
        local new_src_hash
        new_src_hash=$(nix-prefetch-github "${finalAttrs.src.owner}" "${finalAttrs.src.repo}" --rev "$rev" | jq -r .hash)
        echo "New source hash: $new_src_hash"
        update_value_perl "''${prefix}Hash" "$new_src_hash"
      }

      update_pnpm_deps_hash() {
        local prefix="$1"
        echo "Fetching pnpm dependencies hash..."
        
        # First, try to get the hash by temporarily setting it to empty and catching the error
        old_hash_line=$(grep -n "''${prefix}PnpmDeps.*=" "$NIX_FILE" | head -1)
        if [[ -n "$old_hash_line" ]]; then
          old_hash=$(echo "$old_hash_line" | sed -n 's/.*"sha256-\([^"]*\)".*/\1/p')
          echo "Found old hash: sha256-$old_hash"
          
          # Temporarily set hash to empty to trigger hash mismatch
          update_value_perl "''${prefix}PnpmDeps" ""
          echo "Set hash to empty, attempting build..."
          
          # Try to build and capture the expected hash from error message
          if build_output=$(nix-build -E "with import <nixpkgs> {}; (callPackage ./pkgs/vencord.nix { unstable = $UPDATE_BOOL; }).pnpmDeps" --no-link --pure 2>&1); then
            # If it succeeds with empty hash, something is wrong
            echo "Warning: Build succeeded with empty hash, this shouldn't happen"
            update_value_perl "''${prefix}PnpmDeps" "sha256-$old_hash"
          else
            echo "Build failed as expected, extracting hash..."
            # Extract the expected hash from error message - try multiple patterns
            if new_pnpm_hash=$(echo "$build_output" | grep -oE "got:\s+sha256-[A-Za-z0-9+/=]+" | sed 's/got:\s*//' | head -1); then
              echo "New pnpm deps hash: $new_pnpm_hash"
              update_value_perl "''${prefix}PnpmDeps" "$new_pnpm_hash"
            elif new_pnpm_hash=$(echo "$build_output" | grep -oE "sha256-[A-Za-z0-9+/=]+" | tail -1); then
              echo "New pnpm deps hash (fallback): $new_pnpm_hash"
              update_value_perl "''${prefix}PnpmDeps" "$new_pnpm_hash"
            else
              echo "Warning: Could not extract hash from build output"
              echo "=== BUILD OUTPUT START ==="
              echo "$build_output"
              echo "=== BUILD OUTPUT END ==="
              # Restore old hash
              update_value_perl "''${prefix}PnpmDeps" "sha256-$old_hash"
            fi
          fi
        else
          echo "Warning: Could not find existing pnpm deps hash line"
        fi
      }

      get_latest_stable_tag() {
        curl -s "https://api.github.com/repos/${finalAttrs.src.owner}/${finalAttrs.src.repo}/tags" |
          jq -r '.[] | select(.name | test("^v[0-9]+\\.[0-9]+\\.[0-9]+$")) | .name' |
          sort -Vr |
          head -1
      }

      if [ "$UPDATE_BOOL" = "true" ]; then
        base_version=$(get_latest_stable_tag | sed 's/^v//')
        echo "Getting main branch commit info..."
        main_commit_response=$(curl -s "https://api.github.com/repos/Vendicated/Vencord/commits/main")
        
        if ! echo "$main_commit_response" | jq empty 2>/dev/null; then
          echo "Error: Invalid JSON response from GitHub API"
          echo "Response: $main_commit_response"
          exit 1
        fi
        
        revision=$(echo "$main_commit_response" | jq -r '.sha // empty')
        if [[ -z "$revision" || "$revision" == "null" ]]; then
          echo "Error: Could not extract sha from API response"
          echo "Response: $main_commit_response"
          exit 1
        fi
        
        echo "Getting commit details for $revision..."
        commit_response=$(curl -s "https://api.github.com/repos/Vendicated/Vencord/commits/$revision")
        
        if ! echo "$commit_response" | jq empty 2>/dev/null; then
          echo "Error: Invalid JSON response from GitHub API for commit details"
          echo "Response: $commit_response"
          exit 1
        fi
        
        commit_date=$(echo "$commit_response" | jq -r '.commit.committer.date // empty' | cut -d'T' -f1)
        if [[ -z "$commit_date" || "$commit_date" == "null" ]]; then
          echo "Error: Could not extract commit date from API response"
          echo "Response: $commit_response"
          exit 1
        fi
        
        version="''${base_version}-unstable-''${commit_date}"
        echo "New $UPDATE_TYPE version: $version"
        echo "New revision: $revision"
        update_value_perl "''${UPDATE_TYPE}Rev" "$revision"
      else
        new_tag=$(get_latest_stable_tag)
        if [[ ! "$new_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
          echo "Error: Invalid stable version format: $new_tag"
          exit 1
        fi
        version="''${new_tag#v}"
        revision="$new_tag"
        echo "New $UPDATE_TYPE version: $version"
      fi

      update_value_perl "''${UPDATE_TYPE}Version" "$version"
      update_source_hash "$revision" "$UPDATE_TYPE"
      update_pnpm_deps_hash "$UPDATE_TYPE"
    '';
  };

  meta = {
    description = "Vencord web extension" + lib.optionalString unstable " (Unstable)";
    homepage = "https://github.com/Vendicated/Vencord";
    license = lib.licenses.gpl3Only;
    maintainers = with lib.maintainers; [
      donteatoreo
      FlafyDev
      NotAShelf
      Scrumplex
    ];
  };
})
