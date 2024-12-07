# Nixcord
Manage [Vencord](https://github.com/Vendicated/Vencord) settings and plugins declaratively with Nix!

This repo can be used to make a clean looking config for Vencord
without needing to polute system config with needless utils to
override the discord pacakge, and write ugly JSON code directly
in .nix files.

I started this project after having to reinstall my NixOS system
several times, resulting in manually enabling and configuring the
~100 Vencord plugins more than 4 times. With Nixcord you can
configure once and save it to a git repo.

>[!WARNING]
> Using Nixcord means comitting to declaratively installing plugins.
> This means that the normal "plugins" menu in Vencord will not
> apply permenant changes. You can still use it to test out plugins
> but on restarting the client, any changes will be gone.
>
> The primary goal of this project is to reduce the need to configure
> Vencord again on every new system you install.

## How to use Nixcord
Currently Nixcord only supports nix flakes as a [home-manager](https://github.com/nix-community/home-manager) module.

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
## Configuration
This is an example home-manager configuration using Nixcord
```nix
# home.nix
{
  # ...
  programs.nixcord = {
    enable = true;  # enable Nixcord. Also installs discord package
    quickCss = "some CSS";  # quickCSS file
    config = {
      useQuickCss = true;   # use out quickCSS
      themeLinks = [        # or use an online theme
        "https://raw.githubusercontent.com/link/to/some/theme.css"
      ];
      frameless = true; # set some Vencord options
      plugins = {
        hideAttachments.enable = true;    # Enable a Vencord plugin
        ignoreActivities = {    # Enable a plugin and set some options
          enable = true;
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

It is highly recommend configuring Nixcord with an open Vencord client
to look through available plugins and options.
A list of all available options is available [here](docs/INDEX.md).

## Special Thanks
Special Thanks to [Vencord](https://github.com/Vendicated/Vencord), [Home Manager](https://github.com/nix-community/home-manager), and [Nix](https://nixos.org/) and all the
contributers behind them. Without them, this project would
not be possible.

## Disclaimer
Using Vencord violates Discord's terms of service. Read more about
it at [their github](https://github.com/Vendicated/Vencord)
