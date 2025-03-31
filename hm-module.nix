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
    pkg.overrideAttrs {
      postPatch = lib.concatLines (
        lib.optional (cfg.userPlugins != { }) "mkdir -p src/userplugins"
        ++ lib.mapAttrsToList (
          name: path:
          "ln -s ${lib.escapeShellArg path} src/userplugins/${lib.escapeShellArg name} && ls src/userplugins"
        ) cfg.userPlugins
      );
    };

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
        default = pkgs.discord;
        description = ''
          The Discord package to use
        '';
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
            cfg.discord.package.override (
              {
                withVencord = cfg.discord.vencord.enable;
                withOpenASAR = cfg.discord.openASAR.enable;
                inherit vencord;
              }
              // lib.optionalAttrs pkgs.stdenvNoCC.hostPlatform.isLinux {
                enableAutoscroll = cfg.discord.autoscroll.enable;
              }
            )
          ))
          (mkIf cfg.vesktop.enable (
            cfg.vesktop.package.override {
              withSystemVencord = true;
              withMiddleClickScroll = cfg.vesktop.autoscroll.enable;
              inherit vencord;
            }
          ))
        ];
      }
      (mkIf cfg.discord.enable (mkMerge [
        {
          home.activation.disableDiscordUpdates = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
            ${lib.getExe pkgs.discord.passthru.disableBreakingUpdates}
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
      # Warnings
      {
        warnings = import ./warnings.nix { inherit cfg mkIf; };
      }
    ]);
}
