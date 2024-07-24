{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.programs.nixcord;

  mkIfElse = p: yes: no: mkMerge [
    (mkIf p yes)
    (mkIf (!p) no)
  ];

  inherit (lib)
    mkEnableOption
    mkOption
    types
    mkIf
    mkMerge
    attrsets
    ;

  inherit (pkgs.callPackage ./lib.nix { })
    mkVencordCfg
    ;
in {
  options.programs.nixcord = {
    enable = mkEnableOption "Enables Discord with Vencord";
    discord.enable = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to enable discord
        Disable to only install Vesktop
      '';
    };
    vesktop.enable = mkEnableOption ''
      Whether to enable Vesktop
    '';
    package = mkOption {
      type = types.package;
      default = pkgs.discord;
      description = ''
        The Discord package to use
      '';
    };
    vesktopPackage = mkOption {
      type = types.package;
      default = pkgs.vesktop;
      description = ''
        The Vesktop package to use
      '';
    };
    configDir = mkOption {
      type = types.path;
      default = "${config.xdg.configHome}/Vencord";
      description = "Vencord config directory";
    };
    vesktopConfigDir = mkOption {
      type = types.path;
      default = "${config.xdg.configHome}/vesktop";
      description = "Config path for vesktop";
    };
    vencord.enable = mkOption {
      type = types.bool;
      default = true;
      description = "Enable Vencord (for non-vesktop)";
    };
    openASAR.enable = mkOption {
      type = types.bool;
      default = true;
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
      type = with types; nullOr attrs;
      default = null;
      description = ''
        Options to override vencord config for Vesktop. Use to set different
        settings between configs
      '';
    };
    extraConfig = mkOption {
      type = with types; nullOr attrs;
      default = null;
      description = "Vencord extra config";
    };
  };

  config = mkIf cfg.enable (mkMerge [
    {
      home.packages = [
        (mkIf cfg.discord.enable (cfg.package.override {
          withVencord = cfg.vencord.enable;
          withOpenASAR = cfg.openASAR.enable;
        }))
        (mkIf cfg.vesktop.enable cfg.vesktopPackage)
      ];
    }
    (mkIf cfg.discord.enable (mkMerge [
      {
        home.file."${cfg.configDir}/settings/quickCss.css".text = cfg.quickCss;
      }
      (mkIfElse (!builtins.isNull cfg.extraConfig) {
        home.file."${cfg.configDir}/settings/settings.json".text =
          builtins.toJSON (mkVencordCfg (
            attrsets.recursiveUpdate cfg.config cfg.extraConfig));
      } {
        home.file."${cfg.configDir}/settings/settings.json".text =
          builtins.toJSON (mkVencordCfg cfg.config);
      })
    ]))
    (mkIf cfg.vesktop.enable (mkMerge [
      {
        home.file."${cfg.vesktopConfigDir}/settings/quickCss.css".text = cfg.quickCss;
      }
      (mkIfElse (!builtins.isNull cfg.vesktopConfig) {
        home.file."${cfg.vesktopConfigDir}/settings/settings.json".text =
          builtins.toJSON (mkVencordCfg (
            attrsets.recursiveUpdate cfg.config cfg.vesktopConfig));
      } {
        home.file."${cfg.vesktopConfigDir}/settings/settings.json".text =
          builtins.toJSON (mkVencordCfg cfg.config);
      })
    ]))
  ]);
}
