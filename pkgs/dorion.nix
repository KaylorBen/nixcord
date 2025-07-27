{
  lib,
  stdenvNoCC,
  fetchurl,
  autoPatchelfHook,
  dpkg,
  glib-networking,
  gst_all_1,
  libappindicator,
  libayatana-appindicator,
  webkitgtk_4_1,
  wrapGAppsHook3,
  undmg,
  rpm,
  cpio,
  cacert,
  coreutils,
  curl,
  jq,
  nix,
  perl,
  sd,
  writeShellApplication,
}:

let
  pname = "dorion";
  version = "6.9.1";

  sources = {
    "x86_64-darwin" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_x64.dmg";
      hash = "sha256-a5WTWy/BQcmpGstd7js4dhxMCBbnvQGmgNnXYJPMYwo=";
      unpackCmd = "undmg \"$curSrc\"";
    };
    "aarch64-darwin" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_aarch64.dmg";
      hash = "sha256-s5ymVcHdI/WJPi+LrZhgiisghHOK+EKXWZBTkCyKJCg=";
      unpackCmd = "undmg \"$curSrc\"";
    };
    "x86_64-linux" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}-1.x86_64.rpm";
      hash = "sha256-PRp2UeYh1orWQ1/HC2JVCJY5hL79dWRS4JvcK+4gRqY=";
      unpackCmd = "rpm2cpio \"$curSrc\" | cpio -idmv";
    };
    "aarch64-linux" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_arm64.deb";
      hash = "sha256-pH0y0+h7t6xJLroQm1BkoUVnbPQ/nwpy7zAN8oidoOQ=";
      unpackCmd = "dpkg -X \"$curSrc\" .";
    };
  };

  sourceInfo =
    sources.${stdenvNoCC.hostPlatform.system}
      or (throw "Unsupported platform: ${stdenvNoCC.hostPlatform.system}");

  buildInputs = lib.optionals stdenvNoCC.isLinux [
    autoPatchelfHook
    glib-networking
    gst_all_1.gst-plugins-bad
    gst_all_1.gst-plugins-base
    gst_all_1.gst-plugins-good
    webkitgtk_4_1
    libappindicator
    libayatana-appindicator
  ];

  nativeBuildInputs =
    lib.optionals stdenvNoCC.isDarwin [ undmg ]
    ++ lib.optionals stdenvNoCC.isLinux [
      autoPatchelfHook
      wrapGAppsHook3
    ]
    ++ lib.optionals (lib.hasSuffix "rpm" sourceInfo.url) [
      rpm
      cpio
    ]
    ++ lib.optionals (lib.hasSuffix "deb" sourceInfo.url) [ dpkg ];
in
stdenvNoCC.mkDerivation (finalAttrs: {
  inherit
    pname
    version
    buildInputs
    nativeBuildInputs
    ;

  src = fetchurl {
    url = sourceInfo.url;
    hash = sourceInfo.hash;
  };

  unpackCmd = sourceInfo.unpackCmd;

  sourceRoot = lib.optionalString stdenvNoCC.isDarwin "Dorion.app";

  runtimeDependencies = lib.optionals stdenvNoCC.isLinux [
    glib-networking
    libappindicator
    libayatana-appindicator
  ];

  installPhase =
    if stdenvNoCC.isDarwin then
      ''
        runHook preInstall

        mkdir -p "$out/Applications"
        mkdir -p "$out/bin"
        cp -r . "$out/Applications/Dorion.app"
        ln -s "$out/Applications/Dorion.app/Contents/MacOS/Dorion" "$out/bin/dorion"
        chmod +x "$out/bin/dorion"

        runHook postInstall
      ''
    else
      ''
        runHook preInstall

        mkdir -pv "$out"
        mv -v {bin,lib,share} "$out"

        # Wrap the binary to fix Wayland and graphics issues
        mv "$out/bin/Dorion" "$out/bin/.Dorion-unwrapped"
        cat > "$out/bin/Dorion" << 'EOF'
        #!/bin/sh
        export GDK_BACKEND=x11
        export WEBKIT_DISABLE_COMPOSITING_MODE=1
        export WEBKIT_DISABLE_DMABUF_RENDERER=1
        export LIBGL_ALWAYS_SOFTWARE=1
        exec "$(dirname "$0")/.Dorion-unwrapped" "$@"
        EOF
        chmod +x "$out/bin/Dorion"

        ln -s "$out/bin/Dorion" "$out/bin/dorion"

        runHook postInstall
      '';

  passthru.updateScript = writeShellApplication {
    name = "dorion-update";
    runtimeInputs = [
      cacert
      coreutils
      curl
      jq
      nix
      perl
      sd
    ];
    text = ''
      NIX_FILE="./pkgs/dorion.nix"

      # Validation
      if [[ ! -f "$NIX_FILE" ]]; then
          echo "Error: Could not find Nix expression at '$NIX_FILE'" >&2
          exit 1
      fi

      # Create backup  
      backup_file="$NIX_FILE.backup.$(date +%s)"
      cp "$NIX_FILE" "$backup_file"
      echo "Created backup: $backup_file"

      # Cleanup function
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

      echo "Fetching latest Dorion version from GitHub..."

      # Fetch with retries
      for attempt in {1..3}; do
        if LATEST_VERSION=$(timeout 30 curl -s "https://api.github.com/repos/SpikeHD/Dorion/releases/latest" 2>/dev/null | jq -r .tag_name 2>/dev/null); then
          break
        fi
        if [[ $attempt == 3 ]]; then
          echo "Error: Failed to fetch latest version after 3 attempts" >&2
          exit 1
        fi
        echo "Attempt $attempt failed, retrying..."
        sleep 2
      done

      if [[ -z "$LATEST_VERSION" || "$LATEST_VERSION" == "null" ]]; then
        echo "Error: Invalid version received: '$LATEST_VERSION'" >&2
        exit 1
      fi

      CLEAN_VERSION="''${LATEST_VERSION#v}"

      # Validate version format
      if [[ ! "$CLEAN_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "Error: Invalid version format: '$CLEAN_VERSION' (expected: X.Y.Z)" >&2
        exit 1
      fi

      echo "Latest version: $CLEAN_VERSION"

      # Get current version
      if ! CURRENT_VERSION=$(perl -ne 'print $1 if /^\s*version\s*=\s*"([^"]+)";/' "$NIX_FILE" 2>/dev/null); then
        echo "Error: Failed to extract current version" >&2
        exit 1
      fi

      if [[ -z "$CURRENT_VERSION" ]]; then
        echo "Error: No current version found in $NIX_FILE" >&2
        exit 1
      fi

      echo "Current version: $CURRENT_VERSION"

      if [[ "$CLEAN_VERSION" == "$CURRENT_VERSION" ]]; then
        echo "Already up to date"
        exit 0
      fi

      echo "Updating from $CURRENT_VERSION to $CLEAN_VERSION"

      # Update version
      if ! sd "version\s*=\s*\"[^\"]+\";" "version = \"$CLEAN_VERSION\";" "$NIX_FILE"; then
        echo "Error: Failed to update version in file" >&2
        exit 1
      fi

      declare -A platforms=(
        ["x86_64-darwin"]="Dorion_''${CLEAN_VERSION}_x64.dmg"
        ["aarch64-darwin"]="Dorion_''${CLEAN_VERSION}_aarch64.dmg"
        ["x86_64-linux"]="Dorion_''${CLEAN_VERSION}-1.x86_64.rpm"
        ["aarch64-linux"]="Dorion_''${CLEAN_VERSION}_arm64.deb"
      )

      # Track updates
      updated_platforms=()
      failed_platforms=()

      for platform in "''${!platforms[@]}"; do
        filename="''${platforms[$platform]}"
        url="https://github.com/SpikeHD/Dorion/releases/download/v''${CLEAN_VERSION}/''${filename}"
        
        echo "Processing $platform ($filename)..."
        echo "  URL: $url"
        
        # Fetch hash with timeout and validation
        echo "  Fetching hash..."
        if ! prefetch_output=$(timeout 120 nix-prefetch-url "$url" 2>&1); then
          echo "  Warning: Failed to fetch hash for $platform" >&2
          echo "  Error output: $prefetch_output" >&2
          failed_platforms+=("$platform")
          continue
        fi
        
        if [[ -z "$prefetch_output" ]]; then
          echo "  Warning: Empty output from nix-prefetch-url for $platform" >&2
          failed_platforms+=("$platform")
          continue
        fi
        
        new_hash=$(echo "$prefetch_output" | grep -E '^[a-z0-9]{52}$' | tail -1)
        if [[ -z "$new_hash" ]]; then
          echo "  Warning: Could not extract hash from nix-prefetch-url output for $platform" >&2
          echo "  Full output: $prefetch_output" >&2
          failed_platforms+=("$platform")
          continue
        fi
        
        echo "  Successfully fetched hash: $new_hash"
        
        # Convert to SRI format
        echo "  Converting to SRI format..."
        if ! sri_hash_output=$(nix hash to-sri "sha256:$new_hash" 2>&1); then
          echo "  Warning: Failed to convert hash to SRI format for $platform" >&2
          echo "  Hash conversion error: $sri_hash_output" >&2
          failed_platforms+=("$platform")
          continue
        fi
        
        sri_hash=$(echo "$sri_hash_output" | grep -E '^sha256-[A-Za-z0-9+/=]+$' | tail -1)
        if [[ -z "$sri_hash" ]]; then
          echo "  Warning: Could not extract SRI hash from conversion output for $platform" >&2
          echo "  Full conversion output: $sri_hash_output" >&2
          failed_platforms+=("$platform")
          continue
        fi
        echo "  Generated SRI hash: $sri_hash"
        
        # Update file
        echo "  Updating file with new hash..."
        if ! perl -i -pe "
          BEGIN { \$in_platform = 0; }
          if (/^\s*\"$platform\"\s*=\s*\{/) { \$in_platform = 1; next; }
          if (\$in_platform && /^\s*\}/) { \$in_platform = 0; next; }
          if (\$in_platform && /^\s*hash\s*=\s*\"sha256-[A-Za-z0-9+\/=]*\"\s*;/) {
            s|(^\s*hash\s*=\s*\").*(\"\s*;)|\$1$sri_hash\$2|;
            \$in_platform = 0;
          }
        " "$NIX_FILE" 2>/dev/null; then
          echo "  Error: Failed to update hash in file for $platform" >&2
          failed_platforms+=("$platform")
          continue
        fi
        
        updated_platforms+=("$platform")
        echo "  Successfully updated $platform hash to: $sri_hash"
      done

      # Summary
      echo ""
      echo "Update Summary:"
      echo "  Successfully updated: ''${#updated_platforms[@]} platforms"
      if [[ ''${#updated_platforms[@]} -gt 0 ]]; then
        printf "    - %s\n" "''${updated_platforms[@]}"
      fi

      if [[ ''${#failed_platforms[@]} -gt 0 ]]; then
        echo "  Failed updates: ''${#failed_platforms[@]} platforms"
        printf "    - %s\n" "''${failed_platforms[@]}"
      fi

      if [[ ''${#updated_platforms[@]} -eq 0 ]]; then
        echo "Error: No platforms were successfully updated" >&2
        exit 1
      fi

      echo "Dorion update completed successfully!"
    '';
  };

  meta = {
    description = "Tiny alternative Discord client";
    homepage = "https://github.com/SpikeHD/Dorion";
    license = lib.licenses.gpl3Only;
    mainProgram = "dorion";
    maintainers = with lib.maintainers; [ aleksana ];
    platforms = lib.platforms.unix;
    sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
  };
})
