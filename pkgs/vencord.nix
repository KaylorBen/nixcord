# Made from nixpkgs pkg and updated with nix-update
# identical to nixpkgs source, but maintained here for
# quicker updates that don't wait on hydra

{
  esbuild,
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
  stableVersion = "1.12.3";
  stableHash = "sha256-fOZXgyA61G+D7otNNO8d89ghR/GiYPJ7vSZtj9TeGuU=";
  stablePnpmDeps = "sha256-hO6QKRr4jTfesRDAEGcpFeJmGTGLGMw6EgIvD23DNzw=";

  unstableVersion = "1.12.3-unstable-2025-06-20";
  unstableRev = "658a62860e40f9411c26f30b8327f61431d3a92e";
  unstableHash = "sha256-qizTKlD53Im/UZJ1gI1jRPmRYoEwEIEUnWR6nLXIJlg=";
  unstablePnpmDeps = "sha256-hO6QKRr4jTfesRDAEGcpFeJmGTGLGMw6EgIvD23DNzw=";
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
      if [ "$#" -ne 1 ]; then
        echo "Usage: $0 <stable|unstable>"
        exit 1
      fi

      UPDATE_TYPE="$1"
      NIX_FILE="./pkgs/vencord.nix"

      if [ ! -f "$NIX_FILE" ]; then
        echo "Error: File $NIX_FILE does not exist"
        exit 1
      fi

      cleanup() {
        if [ -f "temp-wrapper.nix" ]; then
          rm -f "temp-wrapper.nix"
        fi
      }
      trap cleanup EXIT

      cat >temp-wrapper.nix <<EOF
      { pkgs ? import <nixpkgs> {} }:
      {
        vencord = pkgs.callPackage ''${NIX_FILE} { unstable = $([[ "$UPDATE_TYPE" == "unstable" ]] && echo "true" || echo "false"); };
      }
      EOF

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

      if [ "$UPDATE_TYPE" = "stable" ]; then
        echo "Updating stable version..."
        
        new_version=$(curl -s "https://api.github.com/repos/${finalAttrs.src.owner}/${finalAttrs.src.repo}/tags" |
          jq -r '.[] | select(.name | test("^v[0-9]+\\.[0-9]+\\.[0-9]+$")) | .name' |
          sort -Vr |
          head -1)

        if [[ ! "$new_version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
          echo "Error: Invalid stable version format: $new_version"
          exit 1
        fi

        clean_version="''${new_version#v}"
        echo "New stable version: $clean_version"
        
        # Update version
        update_value_perl "stableVersion" "$clean_version"

        # Get and update source hash
        echo "Fetching source hash..."
        new_src_hash=$(nix-prefetch-github "${finalAttrs.src.owner}" "${finalAttrs.src.repo}" --rev "$new_version" | jq -r .hash)
        echo "New source hash: $new_src_hash"
        update_value_perl "stableHash" "$new_src_hash"

        # Get and update pnpm deps hash
        echo "Fetching pnpm dependencies hash..."
        pnpm_store_path=$(nix-build --pure temp-wrapper.nix -A vencord.pnpmDeps --no-link 2>/dev/null)
        if [ -n "$pnpm_store_path" ]; then
          new_pnpm_hash=$(nix hash path --sri "$pnpm_store_path")
          echo "New pnpm deps hash: $new_pnpm_hash"
          update_value_perl "stablePnpmDeps" "$new_pnpm_hash"
        else
          echo "Warning: Could not determine pnpm deps hash automatically"
          echo "The build may fail until the hash is manually updated"
        fi

      else
        echo "Updating unstable version..."
        
        # Get base version for unstable naming
        base_version=$(curl -s "https://api.github.com/repos/${finalAttrs.src.owner}/${finalAttrs.src.repo}/tags" |
          jq -r '.[] | select(.name | test("^v[0-9]+\\.[0-9]+\\.[0-9]+$")) | .name' |
          sort -Vr |
          head -1 |
          sed 's/^v//')

        # Get latest commit info
        new_rev=$(curl -s "https://api.github.com/repos/${finalAttrs.src.owner}/${finalAttrs.src.repo}/commits/main" | jq -r .sha)
        commit_date=$(curl -s "https://api.github.com/repos/${finalAttrs.src.owner}/${finalAttrs.src.repo}/commits/$new_rev" | jq -r '.commit.committer.date | split("T")[0]')
        new_version="''${base_version}-unstable-''${commit_date}"
        
        echo "New unstable version: $new_version"
        echo "New revision: $new_rev"

        # Update version and revision
        update_value_perl "unstableVersion" "$new_version"
        update_value_perl "unstableRev" "$new_rev"

        # Get and update source hash
        echo "Fetching source hash..."
        new_src_hash=$(nix-prefetch-github "${finalAttrs.src.owner}" "${finalAttrs.src.repo}" --rev "$new_rev" | jq -r .hash)
        echo "New source hash: $new_src_hash"
        update_value_perl "unstableHash" "$new_src_hash"

        # Get and update pnpm deps hash
        echo "Fetching pnpm dependencies hash..."
        pnpm_store_path=$(nix-build --pure temp-wrapper.nix -A vencord.pnpmDeps --no-link 2>/dev/null)
        if [ -n "$pnpm_store_path" ]; then
          new_pnpm_hash=$(nix hash path --sri "$pnpm_store_path")
          echo "New pnpm deps hash: $new_pnpm_hash"
          update_value_perl "unstablePnpmDeps" "$new_pnpm_hash"
        else
          echo "Warning: Could not determine pnpm deps hash automatically"
          echo "The build may fail until the hash is manually updated"
        fi
      fi

      echo "Update completed successfully!"
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
