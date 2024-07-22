# Vencord Options
All general options related to Vencord not encompassing plugins
```nix
programs.nixcord.config.notifyAboutUpdates
    # Notify user when updates are available
```
```nix
programs.nixcord.config.autoUpdate
    # Auto update
    # afaik this doesn't work with nix
```
```nix
programs.nixcord.config.autoUpdateNotification
    # notify use when Vencord auto updates
```
```nix
programs.nixcord.config.useQuickCss
    # use the quick-CSS theme provided by
    # programs.nixcord.quickCss
```
```nix
programs.nixcord.config.themeLinks
    # list of links to online Vencord themes
    # type: list of strings (links)
```
find themes [here](https://betterdiscord.app/themes) or [here](https://github.com/search?q=discord+theme&type=repositories)
```nix
programs.nixcord.config.enabledThemes
    # list of theme files to enable
    # type: list of strings
    # themes located in configDir/themes
```
```nix
programs.nixcord.config.enableReactDevtools
    # enable react devtools in discord
```
```nix
programs.nixcord.config.frameless
    # remove window frame for discord app
```
```nix
programs.nixcord.config.transparent
    # add transparency if environment supports it
```
```nix
programs.nixcord.config.disableMinSize
    # disable the minimum size for the discord window
```
```nix
programs.nixcord.config.plugins
```
Look [here](./plugins.md) for plugin configs
