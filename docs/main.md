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
```