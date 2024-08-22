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

  recursiveUpdateAttrsList = list:
    if (builtins.length list <= 1) then (builtins.elemAt list 0) else
      recursiveUpdateAttrsList ([
        (attrsets.recursiveUpdate (builtins.elemAt list 0) (builtins.elemAt list 1))
      ] ++ (lists.drop 2 list));


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
      default = "${if pkgs.stdenvNoCC.isLinux then config.xdg.configHome else "${builtins.getEnv "HOME"}/Library/Application Support"}/Vencord";
      description = "Vencord config directory";
    };
    vesktopConfigDir = mkOption {
      type = types.path;
      default = "${if pkgs.stdenvNoCC.isLinux then config.xdg.configHome else "${builtins.getEnv "HOME"}/Library/Application Support"}/vesktop";
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
      type = types.attrs;
      default = {};
      description = ''
        Options to override vencord config for Vesktop. Use to set different
        settings between configs
      '';
    };
    vencordConfig = mkOption {
      type = types.attrs;
      default = {};
      description = '''';
    };
    extraConfig = mkOption {
      type = types.attrs;
      default = {};
      description = "Vencord extra config";
    };
    userPlugins = let
      regex = "github:([[:alnum:].-]+)/([[:alnum:]/-]+)/([0-9a-f]{40})";
      coerce = value: let
        matches = builtins.match regex value;
        owner = builtins.elemAt matches 0;
        repo = builtins.elemAt matches 1;
        rev = builtins.elemAt matches 2;
      in builtins.fetchGit { url = "https://github.com/${owner}/${repo}"; inherit rev; };
    in
      mkOption {
        type = with types; attrsOf (coercedTo (strMatching regex) coerce dop);
        description = "User plugin to fetch and install. Note that any json required must be enabled in extraConfig";
        default = {};
        example = {
          someCoolPlugin = "github:someUser/someCoolPlugin/someHashHere";
        };
      };
  };

  config = let
    applyPostPatch = pkg: pkg.overrideAttrs {
      postPatch = lib.concatLines(
        lib.optional (cfg.userPlugins != {}) "mkdir -p src/userplugins"
          ++ lib.mapAttrsToList (name: path: "ln -s ${lib.escapeShellArg path} src/userplugins/${lib.escapeShellArg name} && ls src/userplugins") cfg.userPlugins
      );
    };
    vencord = applyPostPatch pkgs.vencord;
  in mkIf cfg.enable (mkMerge [
    {
      home.packages = [
        (mkIf cfg.discord.enable (cfg.package.override {
          withVencord = cfg.vencord.enable;
          withOpenASAR = cfg.openASAR.enable;
          inherit vencord;
        }))
        (mkIf cfg.vesktop.enable (cfg.vesktopPackage.override {
          withSystemVencord = true;
          inherit vencord;
        }))
      ];
    }
    (mkIf cfg.discord.enable (mkMerge [
      {
        home.file."${cfg.configDir}/settings/quickCss.css".text = cfg.quickCss;
      }
      {
        home.file."${cfg.configDir}/settings/settings.json".text =
          builtins.toJSON (mkVencordCfg (
            recursiveUpdateAttrsList [ cfg.config cfg.extraConfig cfg.vencordConfig ]
          ));
      }
    ]))
    (mkIf cfg.vesktop.enable (mkMerge [
      {
        home.file."${cfg.vesktopConfigDir}/settings/quickCss.css".text = cfg.quickCss;
      }
      {
        home.file."${cfg.vesktopConfigDir}/settings/settings.json".text =
          builtins.toJSON (mkVencordCfg (
            recursiveUpdateAttrsList [ cfg.config cfg.extraConfig cfg.vesktopConfig ]
          ));
      }
    ]))
  ]);
}
