{
  lib,
  stdenvNoCC,
  callPackage,
  fetchurl,
  writeShellApplication,
  nix,
  gnugrep,
  curl,
  common-updater-scripts,
}:

let
  packages = rec {
    x86_64-linux = {
      discord = rec {
        version = "0.0.111";
        src = fetchurl {
          url = "https://stable.dl2.discordapp.net/apps/linux/${version}/discord-${version}.tar.gz";
          hash = "sha256-o4U6i223Agtbt1N9v0GO/Ivx68OQcX/N3mHXUX2gruA=";
        };
        branch = "stable";
        binaryName = desktopName;
        desktopName = "Discord";
      };
      discord-ptb = rec {
        version = "0.0.162";
        src = fetchurl {
          url = "https://ptb.dl2.discordapp.net/apps/linux/${version}/discord-ptb-${version}.tar.gz";
          hash = "sha256-UF0Fy7HwrnwTCFnEVjtR7F525+6PAeIMlaUkAPLmVik=";
        };
        branch = "ptb";
        binaryName = "DiscordPTB";
        desktopName = "Discord PTB";
      };
      discord-canary = rec {
        version = "0.0.786";
        src = fetchurl {
          url = "https://canary.dl2.discordapp.net/apps/linux/${version}/discord-canary-${version}.tar.gz";
          hash = "sha256-Q/IrTyQYzM7lkacEjw2t/HD8lJGU9BCPi4Eo2uvbtts=";
        };
        branch = "canary";
        binaryName = "DiscordCanary";
        desktopName = "Discord Canary";
      };
      discord-development = rec {
        version = "0.0.92";
        src = fetchurl {
          url = "https://development.dl2.discordapp.net/apps/linux/${version}/discord-development-${version}.tar.gz";
          hash = "sha256-oG50YrXQUCnbn+rO0EeRjixeqvXYBdnyqdomdPfxfos=";
        };
        branch = "development";
        binaryName = "DiscordDevelopment";
        desktopName = "Discord Development";
      };
    };
    x86_64-darwin = {
      discord = rec {
        version = "0.0.363";
        src = fetchurl {
          url = "https://stable.dl2.discordapp.net/apps/osx/${version}/Discord.dmg";
          hash = "sha256-0C/88CO2lh5GrTretPgd5tnU++psFe1Anzuz25U7MVQ=";
        };
        branch = "stable";
        binaryName = desktopName;
        desktopName = "Discord";
      };
      discord-ptb = rec {
        version = "0.0.194";
        src = fetchurl {
          url = "https://ptb.dl2.discordapp.net/apps/osx/${version}/DiscordPTB.dmg";
          hash = "sha256-D1vaDWyiTo7StkRJWCUV01oZxPmcs+1awdgi71zappc=";
        };
        branch = "ptb";
        binaryName = desktopName;
        desktopName = "Discord PTB";
      };
      discord-canary = rec {
        version = "0.0.891";
        src = fetchurl {
          url = "https://canary.dl2.discordapp.net/apps/osx/${version}/DiscordCanary.dmg";
          hash = "sha256-Qny/Kmddtxij1sg9odK3+0aizxKcgpl0dgVzzliYsvc=";
        };
        branch = "canary";
        binaryName = desktopName;
        desktopName = "Discord Canary";
      };
      discord-development = rec {
        version = "0.0.103";
        src = fetchurl {
          url = "https://development.dl2.discordapp.net/apps/osx/${version}/DiscordDevelopment.dmg";
          hash = "sha256-/wMmSuz4Tsu6Of1HxpZ0ME0m+PWMdFtYpJUwNVDxTrs=";
        };
        branch = "development";
        binaryName = desktopName;
        desktopName = "Discord Development";
      };
    };

    aarch64-darwin = x86_64-darwin;
    default = x86_64-linux;
  };

  meta = {
    description = "All-in-one cross-platform voice and text chat for gamers";
    downloadPage = "https://discordapp.com/download";
    homepage = "https://discordapp.com/";
    license = lib.licenses.unfree;
    mainProgram = "discord";
    platforms = [
      "x86_64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];
    sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
  };

  package = if stdenvNoCC.hostPlatform.isLinux then ./linux.nix else ./darwin.nix;

  allPackages = lib.genAttrs [ "discord" "discord-ptb" "discord-canary" "discord-development" ] (
    pname:
    let
      args = (packages.${stdenvNoCC.hostPlatform.system} or packages.default).${pname};
      drv = callPackage package (
        (lib.removeAttrs args [ "branch" ])
        // {
          inherit pname;
          meta = meta // {
            mainProgram = args.binaryName;
          };
        }
      );
    in
    drv.overrideAttrs (oldAttrs: {
      passthru = (oldAttrs.passthru or { }) // {
        updateScript = writeShellApplication {
          name = "${pname}-update-script";
          runtimeInputs = [
            nix
            gnugrep
            curl
            common-updater-scripts
          ];
          text = ''
            echo "Fetching latest version for Linux..."
            linux_url=$(curl -sI -w '%{redirect_url}' "https://discord.com/api/download/${args.branch}?platform=linux&format=tar.gz" -o /dev/null)
            linux_version=$(echo "$linux_url" | grep -oP '/\K(\d+.){2}\d+')
            linux_hash=$(nix-prefetch-url --type sha256 "$linux_url" | xargs nix hash to-sri --type sha256)
            update-source-version "packages.x86_64-linux.${pname}" "$linux_version" "$linux_hash" --file="./pkgs/discord/default.nix" --system=x86_64-linux

            echo "Fetching latest version for Darwin..."
            darwin_url=$(curl -sI -w '%{redirect_url}' "https://discord.com/api/download/${args.branch}?platform=osx&format=dmg" -o /dev/null)
            darwin_version=$(echo "$darwin_url" | grep -oP '/\K(\d+.){2}\d+')
            darwin_hash=$(nix-prefetch-url --type sha256 "$darwin_url" | xargs nix hash to-sri --type sha256)
            update-source-version "packages.x86_64-darwin.${pname}" "$darwin_version" "$darwin_hash" --file="./pkgs/discord/default.nix" --system=x86_64-darwin
          '';
        };
      };
    })
  );
in
allPackages
// {
  inherit packages;
  discord = allPackages.discord.overrideAttrs (oldAttrs: {
    passthru = (oldAttrs.passthru or { }) // {
      ptb = allPackages.discord-ptb;
      canary = allPackages.discord-canary;
      development = allPackages.discord-development;
      packages = allPackages;
    };
  });
}
