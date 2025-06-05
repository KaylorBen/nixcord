{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.programs.nixcord;

  inherit (lib)
    mkEnableOption
    mkOption
    types
    mkIf
    mkMerge
    attrsets
    lists
    ;

  dop = with types; coercedTo package (a: a.outPath) pathInStore;

  recursiveUpdateAttrsList =
    list:
    if (builtins.length list <= 1) then
      (builtins.elemAt list 0)
    else
      recursiveUpdateAttrsList (
        [
          (attrsets.recursiveUpdate (builtins.elemAt list 0) (builtins.elemAt list 1))
        ]
        ++ (lists.drop 2 list)
      );

  applyPostPatch =
    pkg:
    pkg.overrideAttrs (o: {
      postPatch = lib.concatLines (
        lib.optional (cfg.userPlugins != { }) "mkdir -p src/userplugins"
        ++ lib.mapAttrsToList (
          name: path:
          "ln -s ${lib.escapeShellArg path} src/userplugins/${lib.escapeShellArg name} && ls src/userplugins"
        ) cfg.userPlugins
      );

      postInstall =
        (o.postInstall or "")
        + ''
          cp package.json $out
        '';
    });

  defaultVencord = applyPostPatch (
    pkgs.callPackage ./vencord.nix { unstable = cfg.discord.vencord.unstable; }
  );
in
{
  options.programs.nixcord = {
    enable = mkEnableOption "Enables Discord with Vencord";
    discord = {
      enable = mkOption {
        type = types.bool;
        default = true;
        description = ''
          Whether to enable discord
          Disable to only install Vesktop
        '';
      };
      package = mkOption {
        type = types.package;
        default =
          pkgs.callPackage ./discord.nix (
            lib.optionalAttrs (
              pkgs.stdenvNoCC.isLinux && builtins.fromJSON (lib.versions.major lib.version) < 25
            ) { libgbm = pkgs.mesa; }
          );
        description = ''
          The Discord package to use
        '';
      };
      branch = mkOption {
        type = types.enum [
          "stable"
          "ptb"
          "canary"
          "development"
        ];
        default = "stable";
        description = "The Discord branch to use";
      };
      configDir = mkOption {
        type = types.path;
        default = "${
          if pkgs.stdenvNoCC.isLinux then
            config.xdg.configHome
          else
            "${config.home.homeDirectory}/Library/Application Support"
        }/discord";
        description = "Config path for Discord";
      };
      vencord = {
        enable = mkOption {
          type = types.bool;
          default = true;
          description = "Enable Vencord (for non-vesktop)";
        };
        package = mkOption {
          type = types.package;
          default = defaultVencord;
          description = ''
            The Vencord package to use
          '';
        };
        unstable = mkOption {
          type = types.bool;
          default = false;
          description = "Enable unstable Vencord build from repository's master branch";
        };
      };
      openASAR.enable = mkOption {
        type = types.bool;
        default = true;
        description = "Enable OpenASAR (for non-vesktop)";
      };
      autoscroll.enable = mkOption {
        type = types.bool;
        default = false;
        description = "Enable middle-click autoscrolling";
      };
      settings = mkOption {
        type = types.attrs;
        default = { };
        description = ''
          Settings to be placed in discordConfigDir/settings.json
        '';
      };
    };
    vesktop = {
      enable = mkEnableOption ''
        Whether to enable Vesktop
      '';
      package = mkOption {
        type = types.package;
        default = pkgs.vesktop;
        description = ''
          The Vesktop package to use
        '';
      };
      useSystemVencord = mkOption {
        type = types.bool;
        default = true;
        description = "Use system Vencord package";
      };
      configDir = mkOption {
        type = types.path;
        default = "${
          if pkgs.stdenvNoCC.isLinux then
            config.xdg.configHome
          else
            "${config.home.homeDirectory}/Library/Application Support"
        }/vesktop";
        description = "Config path for Vesktop";
      };
      settings = mkOption {
        type = types.attrs;
        default = { };
        description = ''
          Settings to be placed in vesktop.configDir/settings.json
        '';
      };
      state = mkOption {
        type = types.attrs;
        default = { };
        description = ''
          Settings to be placed in vesktop.configDir/state.json
        '';
      };
      autoscroll.enable = mkOption {
        type = types.bool;
        default = false;
        description = "Enable middle-click autoscrolling";
      };
    };
    dorion = {
      enable = mkEnableOption ''
        Whether to enable Dorion
      '';
      package = mkOption {
        type = types.package;
        default = pkgs.callPackage ./dorion.nix { };
        description = ''
          The Dorion package to use
        '';
      };
      configDir = mkOption {
        type = types.path;
        default = "${
          if pkgs.stdenvNoCC.isLinux then
            config.xdg.configHome
          else
            "${config.home.homeDirectory}/Library/Application Support"
        }/dorion";
        description = "Config path for Dorion";
      };
      theme = mkOption {
        type = types.str;
        default = "none";
        description = "Theme to use in Dorion";
      };
      themes = mkOption {
        type = types.listOf types.str;
        default = [ "none" ];
        description = "List of available themes";
      };
      zoom = mkOption {
        type = types.str;
        default = "1.0";
        description = "Zoom level for the client";
      };
      blur = mkOption {
        type = types.enum [
          "none"
          "blur"
          "acrylic"
        ];
        default = "none";
        description = "Window blur effect type";
      };
      blurCss = mkOption {
        type = types.bool;
        default = true;
        description = "Enable CSS blur effects";
      };
      useNativeTitlebar = mkOption {
        type = types.bool;
        default = false;
        description = "Use native window titlebar";
      };
      startMaximized = mkOption {
        type = types.bool;
        default = false;
        description = "Start Dorion maximized";
      };
      disableHardwareAccel = mkOption {
        type = types.bool;
        default = false;
        description = "Disable hardware acceleration";
      };
      sysTray = mkOption {
        type = types.bool;
        default = false;
        description = "Enable system tray integration";
      };
      trayIconEnabled = mkOption {
        type = types.bool;
        default = true;
        description = "Enable tray icon";
      };
      openOnStartup = mkOption {
        type = types.bool;
        default = false;
        description = "Open Dorion on system startup";
      };
      startupMinimized = mkOption {
        type = types.bool;
        default = false;
        description = "Start minimized to tray";
      };
      multiInstance = mkOption {
        type = types.bool;
        default = false;
        description = "Allow multiple Dorion instances";
      };
      pushToTalk = mkOption {
        type = types.bool;
        default = false;
        description = "Enable push-to-talk";
      };
      pushToTalkKeys = mkOption {
        type = types.listOf types.str;
        default = [ "RControl" ];
        description = "Keys for push-to-talk activation";
      };
      updateNotify = mkOption {
        type = types.bool;
        default = true;
        description = "Show update notifications";
      };
      desktopNotifications = mkOption {
        type = types.bool;
        default = false;
        description = "Enable desktop notifications";
      };
      unreadBadge = mkOption {
        type = types.bool;
        default = true;
        description = "Show unread message badge";
      };
      win7StyleNotifications = mkOption {
        type = types.bool;
        default = false;
        description = "Use Windows 7 style notifications";
      };
      cacheCss = mkOption {
        type = types.bool;
        default = false;
        description = "Cache CSS for faster loading";
      };
      autoClearCache = mkOption {
        type = types.bool;
        default = false;
        description = "Automatically clear cache on startup";
      };
      clientType = mkOption {
        type = types.str;
        default = "default";
        description = "Discord client type to emulate";
      };
      clientMods = mkOption {
        type = types.listOf types.str;
        default = [
          "Shelter"
          "Vencord"
        ];
        description = "Client modifications to enable";
      };
      clientPlugins = mkOption {
        type = types.bool;
        default = true;
        description = "Enable client plugins";
      };
      profile = mkOption {
        type = types.str;
        default = "default";
        description = "Profile name to use";
      };
      streamerModeDetection = mkOption {
        type = types.bool;
        default = false;
        description = "Enable streamer mode detection";
      };
      rpcServer = mkOption {
        type = types.bool;
        default = false;
        description = "Enable RPC server";
      };
      rpcProcessScanner = mkOption {
        type = types.bool;
        default = true;
        description = "Enable RPC process scanner";
      };
      rpcIpcConnector = mkOption {
        type = types.bool;
        default = true;
        description = "Enable RPC IPC connector";
      };
      rpcWebsocketConnector = mkOption {
        type = types.bool;
        default = true;
        description = "Enable RPC WebSocket connector";
      };
      rpcSecondaryEvents = mkOption {
        type = types.bool;
        default = true;
        description = "Enable RPC secondary events";
      };
      proxyUri = mkOption {
        type = types.str;
        default = "";
        description = "Proxy URI to use for connections";
      };
      keybinds = mkOption {
        type = types.attrs;
        default = { };
        description = "Custom keybind mappings";
      };
      keybindsEnabled = mkOption {
        type = types.bool;
        default = true;
        description = "Enable custom keybinds";
      };
      extraSettings = mkOption {
        type = types.attrs;
        default = { };
        description = ''
          Additional settings to merge into config.json.
          These will override any conflicting auto-generated settings.
        '';
      };
    };
    package = mkOption {
      type = with types; nullOr package;
      default = null;
      description = ''
        Deprecated
        The Discord package to use
      '';
    };
    vesktopPackage = mkOption {
      type = with types; nullOr package;
      default = null;
      description = ''
        The Vesktop package to use
      '';
    };
    configDir = mkOption {
      type = types.path;
      default = "${
        if pkgs.stdenvNoCC.isLinux then
          config.xdg.configHome
        else
          "${config.home.homeDirectory}/Library/Application Support"
      }/Vencord";
      description = "Vencord config directory";
    };
    vesktopConfigDir = mkOption {
      type = with types; nullOr path;
      default = null;
      description = "Config path for Vesktop";
    };
    openASAR.enable = mkOption {
      type = with types; nullOr bool;
      default = null;
      description = "Enable OpenASAR (for non-vesktop)";
    };
    quickCss = mkOption {
      type = types.str;
      default = "";
      description = "Vencord quick CSS";
    };
    config = {
      notifyAboutUpdates = mkEnableOption "Notify when updates are available";
      autoUpdate = mkEnableOption "Automaticall update Vencord";
      autoUpdateNotification = mkEnableOption "Notify user about auto updates";
      useQuickCss = mkEnableOption "Enable quick CSS file";
      themeLinks = mkOption {
        type = with types; listOf str;
        default = [ ];
        description = "A list of links to online vencord themes";
        example = [ "https://raw.githubusercontent.com/rose-pine/discord/main/rose-pine.theme.css" ];
      };
      enabledThemes = mkOption {
        type = with types; listOf str;
        default = [ ];
        description = "A list of themes to enable from themes directory";
      };
      enableReactDevtools = mkEnableOption "Enable React developer tools";
      frameless = mkEnableOption "Make client frameless";
      transparent = mkEnableOption "Enable client transparency";
      disableMinSize = mkEnableOption "Disable minimum window size for client";
      plugins = import ./plugins.nix { inherit lib; };
    };
    vesktopConfig = mkOption {
      type = types.attrs;
      default = { };
      description = ''
        additional config to be added to programs.nixcord.config
        for vesktop only
      '';
    };
    vencordConfig = mkOption {
      type = types.attrs;
      default = { };
      description = ''
        additional config to be added to programs.nixcord.config
        for vencord only
      '';
    };
    extraConfig = mkOption {
      type = types.attrs;
      default = { };
      description = ''
        additional config to be added to programs.nixcord.config
        for both vencord and vesktop
      '';
    };
    userPlugins =
      let
        regex = "github:([[:alnum:].-]+)/([[:alnum:]/-]+)/([0-9a-f]{40})";
        coerce =
          value:
          let
            matches = builtins.match regex value;
            owner = builtins.elemAt matches 0;
            repo = builtins.elemAt matches 1;
            rev = builtins.elemAt matches 2;
          in
          builtins.fetchGit {
            url = "https://github.com/${owner}/${repo}";
            inherit rev;
          };
      in
      mkOption {
        type = with types; attrsOf (coercedTo (strMatching regex) coerce dop);
        description = "User plugin to fetch and install. Note that any json required must be enabled in extraConfig";
        default = { };
        example = {
          someCoolPlugin = "github:someUser/someCoolPlugin/someHashHere";
        };
      };
    parseRules = {
      upperNames = mkOption {
        type = with types; listOf str;
        description = "option names to become UPPER_SNAKE_CASE";
        default = [ ];
      };
      lowerPluginTitles = mkOption {
        type = with types; listOf str;
        description = "plugins with lowercase names in json";
        default = [ ];
        example = [ "petpet" ];
      };
      fakeEnums = {
        zero = mkOption {
          type = with types; listOf str;
          description = "strings to evaluate to 0 in JSON";
          default = [ ];
        };
        one = mkOption {
          type = with types; listOf str;
          description = "strings to evaluate to 1 in JSON";
          default = [ ];
        };
        two = mkOption {
          type = with types; listOf str;
          description = "strings to evaluate to 2 in JSON";
          default = [ ];
        };
        three = mkOption {
          type = with types; listOf str;
          description = "strings to evaluate to 3 in JSON";
          default = [ ];
        };
        four = mkOption {
          type = with types; listOf str;
          description = "strings to evaluate to 4 in JSON";
          default = [ ];
        };
        # I've never seen a plugin with more than 5 options for 1 setting
      };
    };
  };

  config =
    let
      parseRules = cfg.parseRules;
      inherit (pkgs.callPackage ./lib.nix { inherit lib parseRules; })
        mkVencordCfg
        ;

      vencord = applyPostPatch cfg.discord.vencord.package;

      isQuickCssUsed =
        appConfig:
        (cfg.config.useQuickCss || appConfig ? "useQuickCss" && appConfig.useQuickCss)
        && cfg.quickCss != "";
    in
    mkIf cfg.enable (mkMerge [
      {
        assertions = [
          {
            assertion = !(cfg.discord.vencord.package != defaultVencord && cfg.discord.vencord.unstable);
            message = "programs.nixcord.discord.vencord: Cannot set both 'package' and 'unstable = true'. Choose one or the other.";
          }
        ];
        home.packages = [
          (mkIf cfg.discord.enable (
            cfg.discord.package.override ({
              withVencord = cfg.discord.vencord.enable;
              withOpenASAR = cfg.discord.openASAR.enable;
              enableAutoscroll = cfg.discord.autoscroll.enable;
              branch = cfg.discord.branch;
              inherit vencord;
            })
          ))
          (mkIf cfg.vesktop.enable (
            cfg.vesktop.package.override {
              withSystemVencord = cfg.vesktop.useSystemVencord;
              withMiddleClickScroll = cfg.vesktop.autoscroll.enable;
              inherit vencord;
            }
          ))
          (mkIf cfg.dorion.enable cfg.dorion.package)
        ];
      }
      (mkIf cfg.discord.enable (mkMerge [
        {
          home.activation.disableDiscordUpdates = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
            ${lib.getExe pkgs.discord.passthru.disableBreakingUpdates}
          '';
          home.activation.fixDiscordModules = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
            set -e

            config_base="${
              if pkgs.stdenvNoCC.isDarwin then
                "${config.home.homeDirectory}/Library/Application Support"
              else
                "${config.xdg.configHome}"
            }"

            for branch in discord discord-ptb discord-canary discord-development; do
              config_dir="$config_base/$branch"
              [ ! -d "$config_dir" ] && continue
              cd "$config_dir" || continue
              # Find versioned directories (e.g., 0.0.89, 0.0.90)
              versions=($(ls -1d [0-9]*.[0-9]*.[0-9]* 2>/dev/null | sort -V || true))
              n=''${#versions[@]}
              if [ "$n" -ge 2 ]; then
                prev="''${versions[$((n-2))]}"
                curr="''${versions[$((n-1))]}"
                prev_modules="$config_dir/$prev/modules"
                curr_modules="$config_dir/$curr/modules"
                # If curr modules is missing or only has 'pending'
                if [ ! -d "$curr_modules" ] || [ "$(ls -A "$curr_modules" 2>/dev/null | grep -v '^pending$' | wc -l)" -eq 0 ]; then
                  if [ -d "$prev_modules" ]; then
                    echo "Copying Discord modules for $branch from $prev to $curr"
                    rm -rf "$curr_modules"
                    cp -a "$prev_modules" "$curr_modules"
                  fi
                fi
              fi
            done
          '';
        }
        # QuickCSS
        (mkIf (isQuickCssUsed cfg.vencordConfig) {
          home.file."${cfg.configDir}/settings/quickCss.css".text = cfg.quickCss;
        })
        # Vencord Settings
        {
          home.file."${cfg.configDir}/settings/settings.json".text = builtins.toJSON (
            mkVencordCfg (recursiveUpdateAttrsList [
              cfg.config
              cfg.extraConfig
              cfg.vencordConfig
            ])
          );
        }
        # Client Settings
        (mkIf (cfg.discord.settings != { }) {
          home.file."${cfg.discord.configDir}/settings.json".text = builtins.toJSON (
            mkVencordCfg cfg.discord.settings
          );
        })
      ]))
      (mkIf cfg.vesktop.enable (mkMerge [
        # QuickCSS
        (mkIf (isQuickCssUsed cfg.vesktopConfig) {
          home.file."${cfg.vesktop.configDir}/settings/quickCss.css".text = cfg.quickCss;
        })
        # Vencord Settings
        {
          home.file."${cfg.vesktop.configDir}/settings/settings.json".text = builtins.toJSON (
            mkVencordCfg (recursiveUpdateAttrsList [
              cfg.config
              cfg.extraConfig
              cfg.vesktopConfig
            ])
          );
        }
        # Vesktop Client Settings
        (mkIf (cfg.vesktop.settings != { }) {
          home.file."${cfg.vesktop.configDir}/settings.json".text = builtins.toJSON (
            mkVencordCfg cfg.vesktop.settings
          );
        })
        # Vesktop Client State
        (mkIf (cfg.vesktop.state != { }) {
          home.file."${cfg.vesktop.configDir}/state.json".text = builtins.toJSON (
            mkVencordCfg cfg.vesktop.state
          );
        })
      ]))
      # Dorion Client Settings
      (mkIf cfg.dorion.enable (mkMerge [
        {
          home.file."${cfg.dorion.configDir}/config.json".text =
            let
              toSnakeCase =
                str:
                lib.pipe str [
                  (builtins.split "([A-Z])")
                  (builtins.foldl' (
                    acc: part:
                    if builtins.isList part then acc + "_" + (lib.toLower (builtins.elemAt part 0)) else acc + part
                  ) "")
                  (builtins.replaceStrings [ "__" ] [ "_" ])
                ];
              dorionConfig =
                {
                  autoupdate = false;
                }
                // (lib.mapAttrs' (name: value: {
                  name = toSnakeCase name;
                  inherit value;
                }) (builtins.removeAttrs cfg.dorion [ "extraSettings" ]));
            in
            builtins.toJSON (dorionConfig // cfg.dorion.extraSettings);
        }
        {
          home.activation.setupDorionVencordSettings = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
            set -e

            webkit_base_dir="${
              if pkgs.stdenvNoCC.isDarwin then
                "${config.home.homeDirectory}/Library/WebKit/com.spikehd.dorion/WebsiteData/Default"
              else
                "${config.home.homeDirectory}/.local/share/dorion/profiles/default/webdata/localstorage"
            }"

            encode_utf16le() {
              local input="$1"
              echo -n "$input" | ${lib.getExe' pkgs.iconv "iconv"} -f UTF-8 -t UTF-16LE | ${lib.getExe pkgs.xxd} -p | tr -d '\n' | tr '[:lower:]' '[:upper:]'
            }

            vencord_settings='${
              builtins.toJSON (
                mkVencordCfg (recursiveUpdateAttrsList [
                  cfg.config
                  cfg.extraConfig
                ])
              )
            }'

            sqlite_paths=()
            for sqlite_file in $(find "$webkit_base_dir" \( -name "*.sqlite3" -o -name "*.localstorage" \) -type f 2>/dev/null); do
              if ${lib.getExe pkgs.sqlite} "$sqlite_file" "SELECT COUNT(*) FROM ItemTable WHERE key = 'VencordSettings';" 2>/dev/null | grep -q "1"; then
                sqlite_paths+=("$sqlite_file")
              fi
            done

            encoded_settings=$(encode_utf16le "$vencord_settings")

            for sqlite_path in "''${sqlite_paths[@]}"; do
              ${lib.getExe pkgs.sqlite} "$sqlite_path" "INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('VencordSettings', X'$encoded_settings');"
            done
          '';
        }
      ]))
      # Warnings
      {
        warnings = import ./warnings.nix { inherit cfg mkIf; };
      }
    ]);
}
