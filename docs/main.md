# Nixcord general options
All options relating to nixcord config outside of Vencord itself

## nixcord
```nix
programs.nixcord.enable
    # enables nixcord
```
## discord.enable
```nix
programs.nixcord.discord.enable
    # enable the discord package and discord config
    # default: true
    # disable this only if you want vesktop without discord
```
## vesktop.enable
```nix
programs.nixcord.vesktop.enable
    # enable the vesktop package and discord config
```
## package
```nix
programs.nixcord.package
    # package of discord to install
    # default: pkgs.discord
```
## vesktopPackage
```nix
programs.nixcord.vesktopPackage
    # package of vesktop to install
    # default: pkgs.vesktop
```
## configDir
```nix
programs.nixcord.configDir
    # path to discord config
    # type: path
    # default: ${config.xdg.configHome}/Vencord
```
## vesktopConfigDir
```nix
programs.nixcord.vesktopConfigDir
    # path to vesktop config
    # type: path
    # default: ${config.xdg.configHome}/vesktop
```
## vencord
```nix
programs.nixcord.vencord.enable
    # whether to install vencord for discord
    # default: true
```
## openASAR
```nix
programs.nixcord.openASAR.enable
    # whether to install OpenASAR with discord
    # default: true
```
## quickCss
```nix
programs.nixcord.quickCss
    # string to write to quickCss.css
    # type: str
```
## config
```nix
programs.nixcord.config
    # vencord configuration and plugins
    # affects both vesktop and desktop versions
```
defined [here](./vencord.md)
## extraConfig
```nix
programs.nixcord.extraConfig
    # additional JSON config to append to settings.json
    # type: attrs
    # only for desktop discord version
```
## vesktopConfig
```nix
programs.nixcord.vesktopConfig
    # additional config to be added to programs.nixcord.config
    # for vesktop only
```
for example, to disable a plugin only in vesktop, the following is valid:
```nix
programs.nixcord = {
    vesktop.enable = true;
    config.plugins.alwaysAnimate.enable = true;
    vesktopConfig.plugins.alwaysAnimate.enable = false;
};
```
> This results in a desktop version of discord with the plugin on
> and a vesktop installation with the plugin off.
>
> By default, all config in programs.nixcord.config is applied to both
> installations.
