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
  version = "6.8.0";

  sources = {
    "x86_64-darwin" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_x64.dmg";
      hash = "sha256-d56gwdDvMy7aHAkqyGJP+NKl1rn1fbgFAVeDFtgdxYI=";
      unpackCmd = "undmg \"$curSrc\"";
    };
    "aarch64-darwin" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_aarch64.dmg";
      hash = "sha256-YlYFRbjwXKyv6X3LaX7jwPXocUlcIDUexHtJhkGz+C0=";
      unpackCmd = "undmg \"$curSrc\"";
    };
    "x86_64-linux" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}-1.x86_64.rpm";
      hash = "sha256-dhX7JsB2UZicvUtkSbf/zd5D7MVugw/15tO3tBoQemk=";
      unpackCmd = "rpm2cpio \"$curSrc\" | cpio -idmv";
    };
    "aarch64-linux" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_arm64.deb";
      hash = "sha256-4oOSApJu7FtXOUFLzT+4mvx+l9TFbSGwh0jkxK2alEI=";
      unpackCmd = "dpkg -X \"$curSrc\" .";
    };
  };

  sourceInfo =
    sources.${stdenvNoCC.hostPlatform.system}
      or (throw "Unsupported platform: ${stdenvNoCC.hostPlatform.system}");

  updateScriptDrv = writeShellApplication {
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
      DEFAULT_NIX_FILE="./pkgs/dorion.nix"
      if [ ! -f "$DEFAULT_NIX_FILE" ]; then
          echo "Error: Could not find Nix expression at '$DEFAULT_NIX_FILE'" >&2
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

      CLEAN_VERSION="''${LATEST_VERSION#v}"

      echo "Latest version: $CLEAN_VERSION"

      CURRENT_VERSION=$(perl -ne 'print $1 if /^\s*version\s*=\s*"([^"]+)";/' "$DEFAULT_NIX_FILE")
      echo "Current version: $CURRENT_VERSION"

      if [[ "$CLEAN_VERSION" == "$CURRENT_VERSION" ]]; then
        echo "Already up to date"
        exit 0
      fi

      echo "Updating from $CURRENT_VERSION to $CLEAN_VERSION"

      sd "version\s*=\s*\"[^\"]+\";" "version = \"$CLEAN_VERSION\";" "$DEFAULT_NIX_FILE"

      declare -A platforms=(
        ["x86_64-darwin"]="Dorion_''${CLEAN_VERSION}_x64.dmg"
        ["aarch64-darwin"]="Dorion_''${CLEAN_VERSION}_aarch64.dmg"
        ["x86_64-linux"]="Dorion_''${CLEAN_VERSION}-1.x86_64.rpm"
        ["aarch64-linux"]="Dorion_''${CLEAN_VERSION}_arm64.deb"
      )

      for platform in "''${!platforms[@]}"; do
        filename="''${platforms[$platform]}"
        url="https://github.com/$OWNER/$REPO/releases/download/v''${CLEAN_VERSION}/''${filename}"
        
        echo "Updating hash for $platform ($filename)..."
        echo "URL: $url"
        
        if ! prefetch_output=$(timeout 120 nix-prefetch-url "$url" 2>&1) || [[ -z "$prefetch_output" ]]; then
          echo "Warning: Failed to fetch hash for $platform, skipping..."
          echo "Error output: $prefetch_output"
          continue
        fi
        
        new_hash=$(echo "$prefetch_output" | grep -E '^[a-z0-9]{52}$' | tail -1)
        if [[ -z "$new_hash" ]]; then
          echo "Warning: Could not extract hash from nix-prefetch-url output for $platform"
          echo "Full output: $prefetch_output"
          continue
        fi
        
        echo "Successfully fetched hash: $new_hash"
        
        if ! sri_hash_output=$(nix hash to-sri "sha256:$new_hash" 2>&1); then
          echo "Warning: Failed to convert hash to SRI format for $platform"
          echo "Hash conversion error: $sri_hash_output"
          continue
        fi
        
        sri_hash=$(echo "$sri_hash_output" | grep -E '^sha256-[A-Za-z0-9+/=]+$' | tail -1)
        if [[ -z "$sri_hash" ]]; then
          echo "Warning: Could not extract SRI hash from conversion output for $platform"
          echo "Full conversion output: $sri_hash_output"
          continue
        fi
        echo "Generated SRI hash: $sri_hash"
        
        echo "Updating file with new hash..."
        perl -i -pe "
          BEGIN { \$in_platform = 0; }
          if (/^\s*\"$platform\"\s*=\s*\{/) { \$in_platform = 1; next; }
          if (\$in_platform && /^\s*\}/) { \$in_platform = 0; next; }
          if (\$in_platform && /^\s*hash\s*=\s*\"sha256-[A-Za-z0-9+\/=]*\"\s*;/) {
            s|(^\s*hash\s*=\s*\").*(\"\s*;)|\$1$sri_hash\$2|;
            \$in_platform = 0;
          }
        " "$DEFAULT_NIX_FILE"
        
        echo "Updated $platform hash to: $sri_hash"
      done

      echo "Dorion update completed successfully!"
    '';
  };

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

  passthru.updateScript = updateScriptDrv;

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
