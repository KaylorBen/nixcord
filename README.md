# Nixcord
Manage Vencord settings and plugins declaratively with NixOS

Currently this project is a wrapper for builtins.toJSON for the
Vencord settings file, and managing CSS and themes. It DOES NOT
control plugin version via flake.lock or any other way.

This repo can be used to make a clean looking config for Vencord
without needing to polute system config with needless utils to
build vencord.

In the future, this repo will contain a much nicer paradigm for
building the configs by setting up a custom helper function to
parse a more "nix friendly" syntax for configuration, into the
json format used in Vencord's config.

## How to use Nixcord
Currently Nixcord only supports nix flakes as a [home-manager](https://github.com/nix-community/home-manager) module.
Please submit a pull request if you use nix-channels and want
to see an installation option for them.

First, you need to import the module:
```nix
# flake.nix
{
  # ...
  inputs.nixcord = {
    url = "github:kaylorben/nixcord"
  };
  # ...
}
```
Next you'll have to import the home-manager module into flake.nix.
This step varies depending on how you have home-manager installed.
Here is a simple example of home-manager installed as a nixos module:
```nix
# flake.nix
{
  # ...
  outputs = inputs@{ nipkgs, home-manager, ... }: {
    nixosConfigurations = {
      hostname = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./configuration.nix
          home-manager.nixosModules.home-manager
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;
            home-manager.users.jdoe = import ./home.nix;

            home-manager.sharedModules = [
              inputs.nixcord.homeManagerModules.nixcord
            ];
          }
        ];
      };
    };
  };
  # ...
}
```
or to install to a specific home
```nix
# home.nix
{
  # ...
  imports = [
    inputs.nixcord.homeManagerModules.nixcord
  ];
  # ...
}
```
After installation, you can easily start editing config
## Usage
This is an example home-manager configuration using Nixcord
```nix
# home.nix
{
  # ...
  programs.nixcord = {
    enable = true;  # enable Nixcord. Also installs discord package
    quickCss = "some CSS";  # quickCSS file
    config = {
      useQuickCSS = true;   # use out quickCSS
      themeLinks = [        # or use an online theme
        "https://raw.githubusercontent.com/link/to/some/theme.css"
      ];
      frameless = true; # set some Vencord options
      plugins = {
        HideAttachments.enabled = true;    # Enable a Vencord plugin
        IgnoreActivities = {    # Enable a plugin and set some options
          enabled = true;
          ignorePlaying = true;
          ignoreWatching = true;
          ignoredActivities = [ "someActivity" ];
        };
      };
    };
    extraConfig = {
      # Some extra JSON config here
      # ...
    };
  };
  # ...
}
```
>[!WARNING]
> Nixcord does not follow many syntax norms of nixos modules.
> This is due to the nature of the Vencord config being incredibly
> inconsistent.
>
> Some of the most common differences are noted below.

All plugins at their base level use enabled instead of enable.
This is probably the most annoying one, but should be fixable in
the future with a custom function to parse them.

Many plugins use JS option types for settings that either become
strings or ints in settings.JSON. This makes some config options
incredibly hard to edit. In general, use a non-declarative Vencord
build to edit these parameters and confirm the coresponding value
in JSON. This too can easily be fixed once the parsing function
is complete, but until then I have created a list of all
inconsistencies [here](./SETTINGS.MD).

The case used for all plugin names is UpperCamelCase, whereas Nix
prefers standard camelCase. This is quite annoying, but should
also be fixable.

## Special Thanks
Special Thanks to [Vencord](https://github.com/Vendicated/Vencord), [Home Manager](https://github.com/nix-community/home-manager), and [Nix](https://nixos.org/) and all the
contributers behind them. Without them, this project would
not be possible.

## Disclaimer
Using Vencord violates Discord's terms of service. Read more about
it at [their github](https://github.com/Vendicated/Vencord)
