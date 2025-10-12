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

          packages = {
            discord = pkgs.callPackage ./pkgs/discord.nix { };
            discord-ptb = pkgs.callPackage ./pkgs/discord.nix { branch = "ptb"; };
            discord-canary = pkgs.callPackage ./pkgs/discord.nix { branch = "canary"; };
            discord-development = pkgs.callPackage ./pkgs/discord.nix { branch = "development"; };
            dorion = pkgs.callPackage ./pkgs/dorion.nix { };
            vencord = pkgs.callPackage ./pkgs/vencord.nix { };
            docs-html =
              (import ./docs {
                inherit pkgs;
                lib = pkgs.lib;
              }).html;
            docs-json =
              (import ./docs {
                inherit pkgs;
                lib = pkgs.lib;
              }).json;
          };

          apps.docs = {
            type = "app";
            program = "${pkgs.writeShellScript "open-docs" ''
              if command -v xdg-open >/dev/null 2>&1; then
                xdg-open "${inputs.self.packages.${system}.docs-html}/share/doc/nixcord/index.xhtml"
              elif command -v open >/dev/null 2>&1; then
                open "${inputs.self.packages.${system}.docs-html}/share/doc/nixcord/index.xhtml"
              else
                echo "Documentation available at: ${
                  inputs.self.packages.${system}.docs-html
                }/share/doc/nixcord/index.xhtml"
              fi
            ''}";
          };
        };
      flake = {
        homeModules = {
          default = inputs.self.homeModules.nixcord;
          nixcord = import ./modules/hm-module.nix;
        };
      };
    };
}
