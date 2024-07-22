# Nixcord general options
All options relating to nixcord config outside of Vencord itself

## nixcord
```nix
programs.nixcord.enable
    # enables nixcord and installs discord package
```
## package
```nix
programs.nixcord.package
    # package of discord to install
    # default: pkgs.discord
```
use this parameter to install vesktop instead of discord
## configDir
```nix
programs.nixcord.configDir
    # path to nixcord installation
    # type: path
    # default: ${config.xdg.configHome}/Vencord
    # for vesktop this is ${config.xdg.configHome}/vesktop
```
## vencord
```nix
programs.nixcord.vencord.enable
    # whether to install vencord
    # default: true
    # disble this if installing vesktop
```
## openASAR
```nix
programs.nixcord.openASAR.enable
    # whether to install OpenASAR with discord
    # default: true
    # disable this if installing vesktop
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
```
defined [here](./vencord.md)
## extraConfig
```nix
programs.nixcord.extraConfig
    # additional JSON config to append to settings.json
    # type: attrs
```
