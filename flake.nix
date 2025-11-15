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
            vencord-unstable = pkgs.callPackage ./pkgs/vencord.nix { unstable = true; };
            equicord = pkgs.callPackage ./pkgs/equicord.nix { };
            generatePluginOptions = pkgs.callPackage ./pkgs/generate-options.nix {
              vencord = pkgs.callPackage ./pkgs/vencord.nix { unstable = false; };
              equicord = pkgs.callPackage ./pkgs/equicord.nix { };
            };
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

          apps.generatePluginOptions = {
            type = "app";
            program = pkgs.lib.getExe (
              pkgs.writeShellApplication {
                name = "generate-plugin-options";
                runtimeInputs = [ pkgs.nixfmt-rfc-style ];
                text = ''
                  nix build .#generatePluginOptions --out-link ./result
                  rm -rf ./modules/plugins
                  cp -r ./result/plugins ./modules/plugins
                  chmod -R u+w ./modules/plugins
                  nixfmt ./modules/plugins/*.nix
                '';
              }
            );
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
