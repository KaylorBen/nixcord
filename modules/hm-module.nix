{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.programs.nixcord;

  inherit (lib)
    mkIf
    mkMerge
    attrsets
    lists
    types
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
      postPatch =
        (o.postPatch or "")
        + lib.concatLines (
          lib.optional (cfg.userPlugins != { }) "mkdir -p src/userplugins"
          ++ lib.mapAttrsToList (
            name: path:
            "ln -s ${lib.escapeShellArg path} src/userplugins/${lib.escapeShellArg name} && ls src/userplugins"
          ) cfg.userPlugins
        );

      postInstall = (o.postInstall or "") + ''
        cp package.json $out
      '';
    });

  defaultVencord = applyPostPatch (
    pkgs.callPackage ../pkgs/vencord.nix { unstable = cfg.discord.vencord.unstable; }
  );

  parseRules = cfg.parseRules;

  inherit (pkgs.callPackage ./lib/core.nix { inherit lib parseRules; })
    mkVencordCfg
    mkFinalPackages
    ;

  activationScripts = import ./lib/activation.nix {
    inherit
      lib
      pkgs
      cfg
      config
      mkVencordCfg
      ;
  };

in
{
  options.programs.nixcord = import ./options.nix {
    inherit
      lib
      pkgs
      config
      dop
      defaultVencord
      ;
  };

  config =
    let
      vencord = applyPostPatch cfg.discord.vencord.package;
      equicord = applyPostPatch cfg.discord.equicord.package;

      isQuickCssUsed =
        appConfig:
        (cfg.config.useQuickCss || appConfig ? "useQuickCss" && appConfig.useQuickCss)
        && cfg.quickCss != "";

      sharedPlugins = import ./plugins/shared.nix { inherit lib; };
      vencordOnlyPlugins = import ./plugins/vencord.nix { inherit lib; };
      equicordOnlyPlugins = import ./plugins/equicord.nix { inherit lib; };

      # Filter plugins based on which client is enabled
      # When vencord: shared + vencord-only (exclude equicord-only)
      # When equicord: shared + equicord-only (exclude vencord-only)
      filterPluginsForClient =
        configAttrs:
        let
          # Get all plugin names from each category
          sharedPluginNames = builtins.attrNames sharedPlugins;
          vencordOnlyPluginNames = builtins.attrNames vencordOnlyPlugins;
          equicordOnlyPluginNames = builtins.attrNames equicordOnlyPlugins;

          # Determine which plugins to include based on enabled client
          allowedPluginNames =
            sharedPluginNames
            ++ (
              if cfg.discord.vencord.enable then
                vencordOnlyPluginNames
              else if cfg.discord.equicord.enable then
                equicordOnlyPluginNames
              else
                [ ]
            );

          # Filter the plugins attribute set
          plugins = configAttrs.plugins or { };
          filteredPlugins = lib.filterAttrs (name: value: builtins.elem name allowedPluginNames) plugins;
        in
        configAttrs // { inherit filteredPlugins; };
    in
    mkIf cfg.enable (mkMerge [
      {
        assertions = [
          {
            assertion = !(cfg.discord.vencord.package != defaultVencord && cfg.discord.vencord.unstable);
            message = "programs.nixcord.discord.vencord: Cannot set both 'package' and 'unstable = true'. Choose one or the other.";
          }
          {
            assertion = !(cfg.discord.vencord.enable && cfg.discord.equicord.enable);
            message = "programs.nixcord.discord: Cannot enable both Vencord and Equicord at the same time. Choose one or the other.";
          }
        ];

        programs.nixcord.finalPackage = mkFinalPackages {
          inherit cfg;
          inherit vencord equicord;
        };

        home.packages = [
          (mkIf cfg.discord.enable cfg.finalPackage.discord)
          (mkIf cfg.vesktop.enable cfg.finalPackage.vesktop)
          (mkIf cfg.dorion.enable cfg.finalPackage.dorion)
        ];
      }
      (mkIf cfg.discord.enable (mkMerge [
        {
          home.activation.disableDiscordUpdates = activationScripts.disableDiscordUpdates;
          home.activation.fixDiscordModules = activationScripts.fixDiscordModules;
        }
        # QuickCSS
        (mkIf (isQuickCssUsed cfg.vencordConfig || isQuickCssUsed cfg.equicordConfig) {
          home.file."${cfg.configDir}/settings/quickCss.css".text = cfg.quickCss;
        })
        # Vencord Settings
        (mkIf cfg.discord.vencord.enable (
          let
            filteredConfig = filterPluginsForClient cfg.config;
            fullConfig = recursiveUpdateAttrsList [
              (filteredConfig // { plugins = filteredConfig.filteredPlugins; })
              cfg.extraConfig
              cfg.vencordConfig
            ];
          in
          {
            home.file."${cfg.configDir}/settings/settings.json".text = builtins.toJSON (
              mkVencordCfg fullConfig
            );
          }
        ))
        # Equicord Settings
        (mkIf cfg.discord.equicord.enable (
          let
            filteredConfig = filterPluginsForClient cfg.config;
            fullConfig = recursiveUpdateAttrsList [
              (filteredConfig // { plugins = filteredConfig.filteredPlugins; })
              cfg.extraConfig
              cfg.equicordConfig
            ];
          in
          {
            home.file."${cfg.configDir}/settings/settings.json".text = builtins.toJSON (
              mkVencordCfg fullConfig
            );
          }
        ))
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
              dorionConfig = {
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
          home.activation.setupDorionVencordSettings = activationScripts.setupDorionVencordSettings;
        }
      ]))
      # Warnings
      {
        warnings = import ../warnings.nix { inherit cfg mkIf; };
      }
    ]);
}
