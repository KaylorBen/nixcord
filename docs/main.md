# Nixcord general options
All options relating to nixcord config outside of Vencord itself

```nix
programs.nixcord.enable
    # enables nixcord and installs discord package
```
```nix
programs.nixcord.package
    # package of discord to install
    # default: pkgs.discord
```
use this parameter to install vesktop instead of discord
```nix
programs.nixcord.configDir
    # path to nixcord installation
    # type: path
    # default: ${config.xdg.configHome}/Vencord
    # for vesktop this is ${config.xdg.configHome}/vesktop
```
```nix
programs.nixcord.vencord.enable
    # whether to install vencord
    # default: true
    # disble this if installing vesktop
```
```nix
programs.nixcord.openASAR.enable
    # whether to install OpenASAR with discord
    # default: true
    # disable this if installing vesktop
```
```nix
programs.nixcord.quickCss
    # string to write to quickCss.css
    # type: str
```
```nix
programs.nixcord.config
    # vencord configuration and plugins
```
defined [here](./vencord.md)
```nix
programs.nixcord.extraConfig
    # additional JSON config to append to settings.json
    # type: attrs
```
