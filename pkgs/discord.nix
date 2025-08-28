{
  lib,
  stdenv,
  fetchurl,
  discord,
  nix,

  # Platform-specific build tools
  autoPatchelfHook, # linux
  makeDesktopItem, # linux
  makeShellWrapper, # linux
  makeWrapper,
  undmg, # darwin
  wrapGAppsHook3, # linux

  # Common
  cacert,
  coreutils, # For base64 in update script
  curl,
  gnugrep,
  sd,
  perl,

  python3,
  runCommand,
  writeShellApplication,

  # Linux runtime dependencies
  alsa-lib,
  at-spi2-atk,
  at-spi2-core,
  atk,
  cairo,
  cups,
  dbus,
  expat,
  fontconfig,
  freetype,
  gdk-pixbuf,
  glib,
  gtk3,
  libappindicator-gtk3,
  libcxx,
  libdbusmenu,
  libdrm,
  libgbm,
  libglvnd,
  libnotify,
  libpulseaudio,
  libuuid,
  libX11,
  libxcb,
  libXcomposite,
  libXcursor,
  libXdamage,
  libXext,
  libXfixes,
  libXi,
  libXrandr,
  libXrender,
  libXScrnSaver,
  libxshmfence,
  libXtst,
  nspr,
  nss,
  pango,
  pipewire,
  speechd-minimal,
  systemd,
  wayland,

  # Options
  branch ? "stable",
  withOpenASAR ? false,
  openasar,
  withVencord ? false,
  vencord,
  enableAutoscroll ? false,
  commandLineArgs ? "",

  # Linux specific options
  withTTS ? true,
}:
let
  versions = {
    linux = {
      stable = "0.0.107";
      ptb = "0.0.157";
      canary = "0.0.748";
      development = "0.0.85";
    };
    darwin = {
      stable = "0.0.358";
      ptb = "0.0.188";
      canary = "0.0.855";
      development = "0.0.97";
    };
  };

  srcs = {
    x86_64-linux = {
      stable = fetchurl {
        url = "https://stable.dl2.discordapp.net/apps/linux/${versions.linux.stable}/discord-${versions.linux.stable}.tar.gz";
        hash = "sha256-uL923Fc8Io0GUnQjaAl7sRahL6CO/qzNzkqk/oKkZCo=";
      };
      ptb = fetchurl {
        url = "https://ptb.dl2.discordapp.net/apps/linux/${versions.linux.ptb}/discord-ptb-${versions.linux.ptb}.tar.gz";
        hash = "sha256-l9wXzzt7KyfSltKZR6f5PDS5nsS8mnWUe7fLhSUaklI=";
      };
      canary = fetchurl {
        url = "https://canary.dl2.discordapp.net/apps/linux/${versions.linux.canary}/discord-canary-${versions.linux.canary}.tar.gz";
        hash = "sha256-kjq8liiC/Op+Ik+r9RSl/tPLDlWiUyIb3cOjAxWpkO0=";
      };
      development = fetchurl {
        url = "https://development.dl2.discordapp.net/apps/linux/${versions.linux.development}/discord-development-${versions.linux.development}.tar.gz";
        hash = "sha256-GW5LrPMr0uS5ko+FwKfU++4hhzqBQ6FDYBoM2fxDQcE=";
      };
    };
    x86_64-darwin = {
      stable = fetchurl {
        url = "https://stable.dl2.discordapp.net/apps/osx/${versions.darwin.stable}/Discord.dmg";
        hash = "sha256-fuldgf89JLVs63EiTN9LUGYOjEsM+ekyr6duE5aDmNo=";
      };
      ptb = fetchurl {
        url = "https://ptb.dl2.discordapp.net/apps/osx/${versions.darwin.ptb}/DiscordPTB.dmg";
        hash = "sha256-rk4srcVyC33vf4HotrQbozAPgwey1QRWkFtILlE2A0M=";
      };
      canary = fetchurl {
        url = "https://canary.dl2.discordapp.net/apps/osx/${versions.darwin.canary}/DiscordCanary.dmg";
        hash = "sha256-O29SZxUDKN3gUuN8LmxrWmG6MjvBE1L0ec99f5rhotg=";
      };
      development = fetchurl {
        url = "https://development.dl2.discordapp.net/apps/osx/${versions.darwin.development}/DiscordDevelopment.dmg";
        hash = "sha256-BVTQPr3Oox/mTNE7LTJfYuKhI8PlkJlznKiOffqpECs=";
      };
    };
    aarch64-darwin = srcs.x86_64-darwin;
    aarch64-linux = throw "Discord does not provide official aarch64-linux builds.";
  };

  currentPlatform = if stdenv.hostPlatform.isLinux then "linux" else "darwin";
  currentSystem = stdenv.hostPlatform.system;
  version =
    versions.${currentPlatform}.${branch}
      or (throw "Invalid branch ${branch} for platform ${currentPlatform}");
  src =
    srcs.${currentSystem}.${branch}
      or (throw "Platform ${currentSystem} not supported for branch ${branch}");

  genericMeta = {
    description = "All-in-one cross-platform voice and text chat for gamers";
    downloadPage = "https://discordapp.com/download";
    homepage = "https://discordapp.com/";
    license = lib.licenses.unfree;
    maintainers = with lib.maintainers; [
      artturin
      donteatoreo
      infinidoge
      jopejoe1
      Scrumplex
    ];
    platforms = [
      "x86_64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];
    sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
  };

  packages =
    builtins.mapAttrs
      (
        key: value:
        let
          binaryName = value.binaryName;
          desktopName = value.desktopName;

          libPath = lib.makeLibraryPath (
            [
              libcxx
              systemd
              libpulseaudio
              libdrm
              libgbm
              stdenv.cc.cc
              alsa-lib
              atk
              at-spi2-atk
              at-spi2-core
              cairo
              cups
              dbus
              expat
              fontconfig
              freetype
              gdk-pixbuf
              glib
              gtk3
              libglvnd
              libnotify
              libX11
              libXcomposite
              libuuid
              libXcursor
              libXdamage
              libXext
              libXfixes
              libXi
              libXrandr
              libXrender
              libXtst
              nspr
              libxcb
              pango
              pipewire
              libXScrnSaver
              libappindicator-gtk3
              libdbusmenu
              wayland
            ]
            ++ lib.optional withTTS speechd-minimal
          );

          desktopItem = makeDesktopItem {
            name = value.pname;
            exec = lib.strings.toLower binaryName;
            icon = value.pname;
            inherit desktopName;
            genericName = genericMeta.description;
            categories = [
              "Network"
              "InstantMessaging"
            ];
            mimeTypes = [ "x-scheme-handler/discord" ];
            startupWMClass = "discord";
          };

          updateScriptDrv = (
            writeShellApplication {
              name = "discord-update";
              runtimeInputs = [
                cacert
                nix
                coreutils # For base64
                curl
                gnugrep
                perl
              ];
              text = ''
                BRANCHES=("stable" "ptb" "canary" "development")
                NIX_FILE="./pkgs/discord.nix"

                # Validation
                if [[ ! -f "$NIX_FILE" ]]; then
                    echo "Error: Could not find Nix expression at '$NIX_FILE'" >&2
                    exit 1
                fi

                backup_file="$NIX_FILE.backup.$(date +%s)"
                cp "$NIX_FILE" "$backup_file"
                echo "Created backup: $backup_file"

                tmp_file=$(mktemp)
                cp "$NIX_FILE" "$tmp_file"

                # Cleanup function
                cleanup() {
                  local exit_code=$?
                  if [[ -f "$tmp_file" ]]; then
                    rm -f "$tmp_file"
                  fi
                  if [[ $exit_code -ne 0 && -f "$backup_file" ]]; then
                    echo "Restoring backup due to error..." >&2
                    cp "$backup_file" "$NIX_FILE"
                  fi
                  rm -f "$backup_file"
                  exit $exit_code
                }
                trap cleanup EXIT

                update_hash_perl() {
                  local platform="$1"
                  local branch="$2"
                  local new_hash="$3"
                  
                  if [[ -z "$platform" || -z "$branch" || -z "$new_hash" ]]; then
                    echo "Error: update_hash_perl requires platform, branch, and new_hash" >&2
                    return 1
                  fi
                  
                  PLATFORM="$platform" BRANCH="$branch" NEWHASH="$new_hash" \
                  perl -0777 -i -pe '
                    my $platform = $ENV{"PLATFORM"};
                    my $branch = $ENV{"BRANCH"};
                    my $new_hash = $ENV{"NEWHASH"};
                    s{
                      ($platform\s*=\s*\{\s*.*?
                        $branch\s*=\s*fetchurl\s*\{
                        .*?
                        hash\s*=\s*")
                        sha256-[A-Za-z0-9+/=]+
                        (";)
                      }
                      {$1$new_hash$2}xms
                    ' "$tmp_file" || die "Failed to update hash for $platform $branch";
                }

                # Track updates
                updated_branches=()
                failed_branches=()

                for BRANCH in "''${BRANCHES[@]}"; do
                  echo "Processing branch: $BRANCH"
                  
                  # LINUX
                  echo "  Fetching Linux URL for $BRANCH..."
                  if ! linux_url=$(timeout 30 curl -sI -L -o /dev/null -w '%{url_effective}' "https://discord.com/api/download/$BRANCH?platform=linux&format=tar.gz" 2>/dev/null); then
                    echo "  Warning: Failed to fetch Linux URL for $BRANCH" >&2
                    failed_branches+=("$BRANCH-linux")
                    continue
                  fi
                  
                  if ! linux_version=$(echo "$linux_url" | grep -oP 'apps/linux/\K([0-9]+\.[0-9]+\.[0-9]+)'); then
                    echo "  Warning: Could not extract Linux version for $BRANCH from URL: $linux_url" >&2
                    failed_branches+=("$BRANCH-linux")
                    continue
                  fi
                  
                  echo "  Found Linux version: $linux_version"
                  
                  echo "  Fetching Linux hash..."
                  if ! linux_hash=$(timeout 120 nix-prefetch-url --type sha256 "$linux_url" 2>/dev/null); then
                    echo "  Warning: Failed to fetch Linux hash for $BRANCH" >&2
                    failed_branches+=("$BRANCH-linux")
                    continue
                  fi
                  
                  if ! linux_sri_hash=$(nix hash convert --to sri --hash-algo sha256 "$linux_hash" 2>/dev/null); then
                    echo "  Warning: Failed to convert Linux hash to SRI for $BRANCH" >&2
                    failed_branches+=("$BRANCH-linux")  
                    continue
                  fi

                  # DARWIN
                  echo "  Fetching Darwin URL for $BRANCH..."
                  if ! darwin_url=$(timeout 30 curl -sI -L -o /dev/null -w '%{url_effective}' "https://discord.com/api/download/$BRANCH?platform=osx&format=dmg" 2>/dev/null); then
                    echo "  Warning: Failed to fetch Darwin URL for $BRANCH" >&2
                    failed_branches+=("$BRANCH-darwin")
                    continue
                  fi
                  
                  if ! darwin_version=$(echo "$darwin_url" | grep -oP 'apps/osx/\K([0-9]+\.[0-9]+\.[0-9]+)'); then
                    echo "  Warning: Could not extract Darwin version for $BRANCH from URL: $darwin_url" >&2
                    failed_branches+=("$BRANCH-darwin")
                    continue
                  fi
                  
                  echo "  Found Darwin version: $darwin_version"
                  
                  echo "  Fetching Darwin hash..."
                  if ! darwin_hash=$(timeout 120 nix-prefetch-url --type sha256 "$darwin_url" 2>/dev/null); then
                    echo "  Warning: Failed to fetch Darwin hash for $BRANCH" >&2
                    failed_branches+=("$BRANCH-darwin")
                    continue
                  fi
                  
                  if ! darwin_sri_hash=$(nix hash convert --to sri --hash-algo sha256 "$darwin_hash" 2>/dev/null); then
                    echo "  Warning: Failed to convert Darwin hash to SRI for $BRANCH" >&2
                    failed_branches+=("$BRANCH-darwin")
                    continue
                  fi

                  # Update versions
                  echo "  Updating versions in file..."
                  
                  # Linux version
                  if ! BRANCH="$BRANCH" LINUX_VERSION="$linux_version" perl -i -pe '
                    my $branch = $ENV{"BRANCH"};
                    my $version = $ENV{"LINUX_VERSION"};
                    if (/^\s*linux\s*=\s*\{/../^\s*\}/) {
                      s/^(\s*)$branch(\s*=\s*)"[^"]+";/$1$branch$2"$version";/;
                    }
                  ' "$tmp_file" 2>/dev/null; then
                    echo "  Error: Failed to update Linux version for $BRANCH" >&2
                    failed_branches+=("$BRANCH-linux-version")
                    continue
                  fi
                  
                  # Darwin version
                  if ! BRANCH="$BRANCH" DARWIN_VERSION="$darwin_version" perl -i -pe '
                    my $branch = $ENV{"BRANCH"};
                    my $version = $ENV{"DARWIN_VERSION"};
                    if (/^\s*darwin\s*=\s*\{/../^\s*\}/) {
                      s/^(\s*)$branch(\s*=\s*)"[^"]+";/$1$branch$2"$version";/;
                    }
                  ' "$tmp_file" 2>/dev/null; then
                    echo "  Error: Failed to update Darwin version for $BRANCH" >&2
                    failed_branches+=("$BRANCH-darwin-version")
                    continue
                  fi

                  # Update hashes
                  echo "  Updating hashes..."
                  if ! update_hash_perl "x86_64-linux" "$BRANCH" "$linux_sri_hash"; then
                    echo "  Error: Failed to update Linux hash for $BRANCH" >&2
                    failed_branches+=("$BRANCH-linux-hash")
                    continue
                  fi
                  
                  if ! update_hash_perl "x86_64-darwin" "$BRANCH" "$darwin_sri_hash"; then
                    echo "  Error: Failed to update Darwin hash for $BRANCH" >&2
                    failed_branches+=("$BRANCH-darwin-hash")
                    continue
                  fi

                  updated_branches+=("$BRANCH")
                  echo "  Successfully updated $BRANCH (Linux: $linux_version, Darwin: $darwin_version)"
                done

                # Summary
                echo ""
                echo "Update Summary:"
                echo "  Successfully updated: ''${#updated_branches[@]} branches"
                if [[ ''${#updated_branches[@]} -gt 0 ]]; then
                  printf "    - %s\n" "''${updated_branches[@]}"
                fi

                if [[ ''${#failed_branches[@]} -gt 0 ]]; then
                  echo "  Failed updates: ''${#failed_branches[@]}"
                  printf "    - %s\n" "''${failed_branches[@]}"
                fi

                # Only update if we have some successes
                if [[ ''${#updated_branches[@]} -gt 0 ]]; then
                  mv "$tmp_file" "$NIX_FILE"
                  echo "Successfully updated $NIX_FILE"
                else
                  echo "No successful updates, keeping original file"
                  exit 1
                fi
              '';
            }
          );

        in
        stdenv.mkDerivation (
          rec {
            inherit version src;
            pname = value.pname;

            nativeBuildInputs = [
              makeWrapper
            ]
            ++ lib.optionals stdenv.hostPlatform.isLinux [
              autoPatchelfHook
              cups
              libdrm
              libuuid
              libXdamage
              libX11
              libXScrnSaver
              libXtst
              libxcb
              libxshmfence
              libgbm
              nss
              wrapGAppsHook3
              makeShellWrapper
            ]
            ++ lib.optionals stdenv.hostPlatform.isDarwin [ undmg ];

            buildInputs = lib.optionals stdenv.hostPlatform.isLinux [
              alsa-lib
              gtk3
              systemd
              pipewire
              wayland
            ];

            runtimeDependencies = lib.optionals stdenv.hostPlatform.isLinux (lib.splitString ":" libPath);

            dontWrapGApps = lib.optional stdenv.hostPlatform.isLinux true;

            sourceRoot = lib.optionalString stdenv.hostPlatform.isDarwin ".";

            installPhase =
              if stdenv.hostPlatform.isLinux then
                ''
                  runHook preInstall

                  mkdir -p $out/{bin,opt/${binaryName},share/pixmaps,share/icons/hicolor/256x256/apps}
                  mv * "$out/opt/${binaryName}"

                  chmod +x "$out/opt/${binaryName}/${binaryName}"
                  patchelf --set-interpreter "${stdenv.cc.bintools.dynamicLinker}" \
                      "$out/opt/${binaryName}/${binaryName}"

                  wrapProgram "$out/opt/${binaryName}/${binaryName}" \
                      "''${gappsWrapperArgs[@]}" \
                      --add-flags "\''${NIXOS_OZONE_WL:+\''${WAYLAND_DISPLAY:+--ozone-platform=wayland --enable-features=WaylandWindowDecorations --enable-wayland-ime=true}}" \
                      ${lib.strings.optionalString withTTS ''
                        --set-default NIXOS_SPEECH True \
                        --add-flags "--enable-speech-dispatcher" \
                      ''} \
                      ${lib.strings.optionalString enableAutoscroll "--add-flags \"--enable-blink-features=MiddleClickAutoscroll\""} \
                      --prefix XDG_DATA_DIRS : "${gtk3}/share/gsettings-schemas/${gtk3.name}/" \
                      --prefix LD_LIBRARY_PATH : ${libPath}:$out/opt/${binaryName} \
                      --add-flags ${lib.escapeShellArg commandLineArgs}

                  ln -s "$out/opt/${binaryName}/${binaryName}" "$out/bin"
                  # Without || true the install would fail on case-insensitive filesystems
                  ln -s "$out/opt/${binaryName}/${binaryName}" "$out/bin/${lib.strings.toLower binaryName}" || true

                  ln -s "$out/opt/${binaryName}/discord.png" "$out/share/pixmaps/${pname}.png"
                  ln -s "$out/opt/${binaryName}/discord.png" "$out/share/icons/hicolor/256x256/apps/${pname}.png"

                  ln -s "$desktopItem/share/applications" "$out/share/"

                  runHook postInstall
                ''
              else
                ''
                  runHook preInstall

                  mkdir -p "$out/Applications"
                  cp -r "${desktopName}.app" "$out/Applications"

                  # wrap executable to $out/bin
                  mkdir -p "$out/bin"
                  makeWrapper "$out/Applications/${desktopName}.app/Contents/MacOS/${binaryName}" "$out/bin/${binaryName}"

                  runHook postInstall
                '';

            postInstall =
              let
                resourcesPath =
                  if stdenv.hostPlatform.isLinux then
                    "$out/opt/${binaryName}/resources"
                  else
                    "$out/Applications/${desktopName}.app/Contents/Resources";
              in
              # OpenASAR
              lib.strings.optionalString (withOpenASAR && openasar != null) ''
                cp -f ${openasar} "${resourcesPath}/app.asar"
              ''
              # Vencord
              + lib.strings.optionalString (withVencord && vencord != null) ''
                mv ${resourcesPath}/app.asar ${resourcesPath}/_app.asar
                mkdir -p ${resourcesPath}/app.asar
                echo '{"name":"discord","main":"index.js"}' > ${resourcesPath}/app.asar/package.json
                echo 'require("${vencord}/patcher.js")' > ${resourcesPath}/app.asar/index.js
              '';

            meta = genericMeta // {
              mainProgram = "discord";
              description =
                genericMeta.description
                + lib.optionalString (withOpenASAR && openasar != null) " (with OpenASAR)"
                + lib.optionalString (withVencord && vencord != null) " (with Vencord)";
            };
            passthru.updateScript = updateScriptDrv;
          }
          // lib.optionalAttrs stdenv.hostPlatform.isLinux { inherit desktopItem; }
          // lib.optionalAttrs stdenv.hostPlatform.isLinux {
            inherit withTTS enableAutoscroll;
          }
        )
      )
      {
        stable = {
          pname = "discord";
          binaryName = "Discord";
          desktopName = "Discord";
        };
        ptb = rec {
          pname = "discord-ptb";
          binaryName = if stdenv.hostPlatform.isLinux then "DiscordPTB" else desktopName;
          desktopName = "Discord PTB";
        };
        canary = rec {
          pname = "discord-canary";
          binaryName = if stdenv.hostPlatform.isLinux then "DiscordCanary" else desktopName;
          desktopName = "Discord Canary";
        };
        development = rec {
          pname = "discord-development";
          binaryName = if stdenv.hostPlatform.isLinux then "DiscordDevelopment" else desktopName;
          desktopName = "Discord Development";
        };
      };
in
packages.${branch}
  or (throw "Invalid branch selected: ${branch}. Valid branches are: ${lib.concatStringsSep ", " (builtins.attrNames packages)}")
