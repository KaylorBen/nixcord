# Nixcord general options
All options relating to nixcord config outside of Vencord itself

## nixcord
```nix
programs.nixcord.enable
    # enables nixcord
```
## discord
```nix
programs.nixcord.discord.enable
    # enable the discord package and discord config
    # default: true
    # disable this only if you want vesktop without discord
programs.nixcord.discord.package
    # package of discord to install
    # default: pkgs.discord
programs.nixcord.discord.branch
    # the discord branch to use
    # default: "stable"
programs.nixcord.discord.configDir
    # path to discord config
    # this is only useful for changing discord/settings.json
    # type: path
    # default: ${if pkgs.stdenvNoCC.isLinux then config.xdg.configHome else "${config.home.homeDirectory}/Library/Application Support"}/discord
programs.nixcord.discord.vencord.enable
    # whether to install vencord for discord
    # default: true
programs.nixcord.discord.vencord.package
    # note: applyPostPatch is always used for userPlugins support
    # vencord package to use with discord
    # type: package
    # default: our bundled vencord package
programs.nixcord.discord.vencord.unstable
    # whether to use the unstable vencord build from master branch
    # default: false
programs.nixcord.discord.openASAR.enable
    # whether to install OpenASAR with discord
    # default: true
programs.nixcord.discord.autoscroll.enable
    # enable middle-click autoscrolling
    # default: false
```
## vesktop
```nix
programs.nixcord.vesktop.enable
    # enable the vesktop package and discord config
programs.nixcord.vesktop.package
    # package of vesktop to install
    # default: pkgs.vesktop
programs.nixcord.vesktop.configDir
    # path to vesktop config
    # type: path
    # default: ${if pkgs.stdenvNoCC.isLinux then config.xdg.configHome else "${config.home.homeDirectory}/Library/Application Support"}/vesktop
programs.nixcord.vesktop.autoscroll.enable
    # enable middle-click autoscrolling
    # default: false
```
## Dorion Setup Requirements

**Important**: Before enabling Dorion with nixcord, you must first launch Dorion
once to create the necessary LocalStorage databases for Vencord settings

1. Run Dorion temporarily to set up the initial environment:
```bash
# Using nix run
nix run github:KaylorBen/nixcord#dorion

# Or using legacy nix-build
nix-build https://github.com/KaylorBen/nixcord/archive/main.tar.gz -A dorion
```

2. In Dorion:
- Log into your Discord account
- Close Dorion completely

3. Now enable Dorion in your Home Manager configuration and rebuildger switch

This step is required because nixcord automatically configures Vencord settings in Dorion's LocalStorage database, but these databases only exist after the first launch and login
## dorion
```nix
programs.nixcord.dorion.enable
    # enable the dorion package
    # note: dorion is a lightweight, tauri-based discord client with built-in vencord support
programs.nixcord.dorion.package
    # package of dorion to install
    # default: pkgs.dorion
programs.nixcord.dorion.configDir
    # path to dorion config
    # type: path
    # default: ${if pkgs.stdenvNoCC.isLinux then config.xdg.configHome else "${config.home.homeDirectory}/Library/Application Support"}/dorion
programs.nixcord.dorion.theme
    # theme to use in dorion
    # default: "none"
programs.nixcord.dorion.themes
    # list of available themes
    # type: listOf str
    # default: ["none"]
programs.nixcord.dorion.zoom
    # zoom level for the client
    # default: "1.0"
programs.nixcord.dorion.blur
    # window blur effect type
    # options: "none", "blur", "acrylic"
    # default: "none"
programs.nixcord.dorion.blurCss
    # enable CSS blur effects
    # default: true
programs.nixcord.dorion.useNativeTitlebar
    # use native window titlebar
    # default: false
programs.nixcord.dorion.startMaximized
    # start dorion maximized
    # default: false
programs.nixcord.dorion.disableHardwareAccel
    # disable hardware acceleration
    # default: false
programs.nixcord.dorion.sysTray
    # enable system tray integration
    # default: false
programs.nixcord.dorion.trayIconEnabled
    # enable tray icon
    # default: true
programs.nixcord.dorion.openOnStartup
    # open dorion on system startup
    # default: false
programs.nixcord.dorion.startupMinimized
    # start minimized to tray
    # default: false
programs.nixcord.dorion.multiInstance
    # allow multiple dorion instances
    # default: false
programs.nixcord.dorion.pushToTalk
    # enable push-to-talk
    # default: false
programs.nixcord.dorion.pushToTalkKeys
    # keys for push-to-talk activation
    # type: listOf str
    # default: ["RControl"]
programs.nixcord.dorion.updateNotify
    # show update notifications
    # default: true
programs.nixcord.dorion.desktopNotifications
    # enable desktop notifications
    # default: false
programs.nixcord.dorion.unreadBadge
    # show unread message badge
    # default: true
programs.nixcord.dorion.win7StyleNotifications
    # use windows 7 style notifications
    # default: false
programs.nixcord.dorion.cacheCss
    # cache CSS for faster loading
    # default: false
programs.nixcord.dorion.autoClearCache
    # automatically clear cache on startup
    # default: false
programs.nixcord.dorion.clientType
    # discord client type to emulate
    # default: "default"
programs.nixcord.dorion.clientMods
    # client modifications to enable
    # type: listOf str
    # default: ["Shelter", "Vencord"]
programs.nixcord.dorion.clientPlugins
    # enable client plugins
    # default: true
programs.nixcord.dorion.profile
    # profile name to use
    # default: "default"
programs.nixcord.dorion.streamerModeDetection
    # enable streamer mode detection
    # default: false
programs.nixcord.dorion.rpcServer
    # enable RPC server
    # default: false
programs.nixcord.dorion.rpcProcessScanner
    # enable RPC process scanner
    # default: true
programs.nixcord.dorion.rpcIpcConnector
    # enable RPC IPC connector
    # default: true
programs.nixcord.dorion.rpcWebsocketConnector
    # enable RPC WebSocket connector
    # default: true
programs.nixcord.dorion.rpcSecondaryEvents
    # enable RPC secondary events
    # default: true
programs.nixcord.dorion.proxyUri
    # proxy URI to use for connections
    # default: ""
programs.nixcord.dorion.keybinds
    # custom keybind mappings
    # type: attrs
    # default: {}
programs.nixcord.dorion.keybindsEnabled
    # enable custom keybinds
    # default: true
programs.nixcord.dorion.extraSettings
    # additional settings to merge into config.json
    # these will override any conflicting auto-generated settings
    # type: attrs
    # default: {}
```
## configDir
```nix
programs.nixcord.configDir
    # path to vencord config
    # type: path
    # default: ${if pkgs.stdenvNoCC.isLinux then config.xdg.configHome else "${config.home.homeDirectory}/Library/Application Support"}/Vencord
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
    # affects both discord and vesktop
```
## vencordConfig
```nix
programs.nixcord.vencordConfig
    # additional config to be added to programs.nixcord.config
    # type: attrs
    # for discord + vencord only
```
## vesktopConfig
```nix
programs.nixcord.vesktopConfig
    # additional config to be added to programs.nixcord.config
    # type: attrs
    # for vesktop only
```
for example, to enable a plugin only in vesktop, the following is valid:
```nix
programs.nixcord = {
    enable = true;
    vesktop.enable = true;
    vesktopConfig.plugins.alwaysAnimate.enable = true;
};
```
> This results in a desktop version of vesktop with the plugin on
> and a vencord/discord installation with the plugin off.
>
> By default, all config in programs.nixcord.config is applied to both
> installations.
## userPlugins
```nix
programs.nixcord.userPlugins
    # enable custom user plugins from github
    # type: attrsOf (coercedTo (strMatching regex))
    # regex matches the form "github:user/repo/commitHash"
```
an example of installing the custom user plugin BetterActivities
```nix
programs.nixcord = {
    enable = true;
    userPlugins = {
        betterActivities = "github:D3SOX/vc-betterActivities/044b504666b8b753ab45d82c0cd0d316b1ea7e60";
    };
    extraConfig = {
        plugins = {
            betterActivities.enable = true;
        };
    };
};
```
> The fields for extraConfig, vesktopConfig, and vencordConfig when
> writing JSON values are parsed by Nixcord's config parser which
> changes a few things to make the resulting nix config more readable
> and consistent with nix style.
>
> The rules below transform key values in attrsets:
> "enable" -> "enabled"
> if the key's value is an attrset containing enable then the key is
> uppercased like the following
> "lowercaseWord" -> "UppercaseWord"
More rules can be used with a few provided options:
## parseRules
```nix
programs.nixcord.parseRules.upperNames
    # option names to become UPPER_SNAKE_CASE
    # type: listOf str
    # this is currently only used in moreUserTags
    # example: [ "voiceModerator" ]
    # this becomes VOICE_MODERATOR in JSON
programs.nixcord.parseRules.lowerPluginTitles
    # plugins with lowercase names in json
    # type: listOf str
    # example: [ "petpet" ]
    # only 2 plugins in main repo follow this convention
    # skips the toUpper call on these specific plugin names
```
## parseRules.fakeEnums
>[!WARNING]
> These options exist as a brute force solution to the specific problem of many
> Vencord plugins using integer values in JSON to represent more descriptive values
> in the settings menu.
> Once a more suitable solution has been found (possible an attrset), then these options
> will be completely deprecated.
> If you want to avoid using these for that reason you can figure out the int value required
> in the user plugin you're trying to add, and write it as the value. This is less readable,
> but will always match to the correct value unless something happens upstream with the plugin.
> This would look something like ``anonymiseFileNames.method = 0;``
```nix
programs.nixcord.parseRules.fakeEnums.zero
    # plugin strings to map to 0
    # type: listOf str
programs.nixcord.parseRules.fakeEnums.one
    # plugin strings to map to 1
    # type: listOf str
programs.nixcord.parseRules.fakeEnums.two
    # plugin strings to map to 2
    # type: listOf str
programs.nixcord.parseRules.fakeEnums.three
    # plugin strings to map to 3
    # type: listOf str
programs.nixcord.parseRules.fakeEnums.four
    # plugin strings to map to 4
    # type: listOf str
```
## settings.json and state.json control
>[!WARNING]
> Due to Vencord/Vesktop#220 this will not work unless you are using a version of nixpkgs later than 24.11
> Otherwise, messing with these will likely cause issues since nix store is read only
```nix
programs.nixcord.discord.settings
    # Settings to be placed in discord.configDir/settings.json
    # type: attrs
programs.nixcord.vesktop.settings
    # Settings to be placed in vesktop.configDir/settings.json
    # type: attrs
programs.nixcord.vesktop.state
    # Settings to be placed in vesktop.configDir/state.json
    # type: attrs
programs.nixcord.dorion.*
    # All dorion settings are type-safe options (see above)
    # Settings are automatically compiled into dorion.configDir/config.json
    # note: dorion uses config.json instead of settings.json
```
