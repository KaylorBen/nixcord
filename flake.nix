{
  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
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
        { system, inputs', ... }:
        let
          pkgs = import inputs.nixpkgs {
            inherit system;
            config.allowUnfree = true;
          };
        in
        {
          _module.args.pkgs = pkgs;
          checks =
            let
              hmEval = import ./modules/tests/hm-eval.nix { pkgs = pkgs; };
              nixosEval = import ./modules/tests/nixos-eval.nix { pkgs = pkgs; };
              darwinEval = import ./modules/tests/darwin-eval.nix { pkgs = pkgs; };
            in
            {
              hm-eval = hmEval;
              nixos-eval = nixosEval;
            }
            // pkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isDarwin {
              darwin-eval = darwinEval;
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
                pkgs = pkgs;
                lib = pkgs.lib;
              }).html;
            docs-json =
              (import ./docs {
                pkgs = pkgs;
                lib = pkgs.lib;
              }).json;
          };

        };

      flake = {
        homeModules = {
          default = import ./modules/hm;
          nixcord = import ./modules/hm;
        };
        darwinModules = {
          default = import ./modules/darwin;
          nixcord = import ./modules/darwin;
        };
        nixosModules = {
          default = import ./modules/nixos;
          nixcord = import ./modules/nixos;
        };
      };
    };
}
