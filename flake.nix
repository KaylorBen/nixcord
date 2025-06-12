{
  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-compat.url = "https://flakehub.com/f/edolstra/flake-compat/1.tar.gz";
  };

  outputs =
    inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ];
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];
      perSystem =
        { pkgs, system, ... }:
        {
          _module.args.pkgs = import inputs.nixpkgs {
            inherit system;
            config.allowUnfree = true;
          };

          packages.discord = pkgs.callPackage ./discord.nix { };
          packages.dorion = pkgs.callPackage ./dorion.nix { };
          packages.vencord = pkgs.callPackage ./vencord.nix { };
        };
      flake = {
        homeModules = {
          default = inputs.self.homeModules.nixcord;
          nixcord = import ./hm-module.nix;
        };
      };
    };
}
