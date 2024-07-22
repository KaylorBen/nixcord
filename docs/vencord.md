# Vencord Options
All general options related to Vencord not encompassing plugins
## notifyAboutUpdates
```nix
programs.nixcord.config.notifyAboutUpdates
    # Notify user when updates are available
```
## autoUpdate
```nix
programs.nixcord.config.autoUpdate
    # Auto update
    # afaik this doesn't work with nix
```
## autoUpdateNotification
```nix
programs.nixcord.config.autoUpdateNotification
    # notify use when Vencord auto updates
```
## useQuickCss
```nix
programs.nixcord.config.useQuickCss
    # use the quick-CSS theme provided by
    # programs.nixcord.quickCss
```
## themeLinks
```nix
programs.nixcord.config.themeLinks
    # list of links to online Vencord themes
    # type: list of strings (links)
```
find themes [here](https://betterdiscord.app/themes) or [here](https://github.com/search?q=discord+theme&type=repositories)
## enabledThemes
```nix
programs.nixcord.config.enabledThemes
    # list of theme files to enable
    # type: list of strings
    # themes located in configDir/themes
```
## enableReactDevtools
```nix
programs.nixcord.config.enableReactDevtools
    # enable react devtools in discord
```
## frameless
```nix
programs.nixcord.config.frameless
    # remove window frame for discord app
```
## transparent
```nix
programs.nixcord.config.transparent
    # add transparency if environment supports it
```
## disableMinSize
```nix
programs.nixcord.config.disableMinSize
    # disable the minimum size for the discord window
```
## plugins
```nix
programs.nixcord.config.plugins
```
Look [here](./plugins.md) for plugin configs
