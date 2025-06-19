{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-compat.url = "https://flakehub.com/f/edolstra/flake-compat/1.tar.gz";
  };

  outputs =
    inputs:
    let
      inherit (inputs.nixpkgs) lib;

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];

      # We need unfree for stuff like discord, even though `import nixpkgs` is
      # slower than direct access to the attrs
      forAllSystems =
        function:
        lib.genAttrs systems (
          system:
          function (
            import inputs.nixpkgs {
              inherit system;
              config.allowUnfree = true;
            }
          )
        );
    in
    {
      packages = forAllSystems (
        pkgs:
        let
          docs = import ./docs {
            inherit pkgs;
            lib = pkgs.lib;
          };
        in
        {
          discord = pkgs.callPackage ./pkgs/discord.nix { };
          dorion = pkgs.callPackage ./pkgs/dorion.nix { };
          vencord = pkgs.callPackage ./pkgs/vencord.nix { };
          docs-html = docs.html;
          docs-json = docs.json;
        }
      );

      apps = forAllSystems (pkgs: {
        docs = {
          type = "app";
          program =
            let
              docs-html = inputs.self.packages.${pkgs.system}.docs-html;
              script = # bash
                ''
                  if command -v xdg-open >/dev/null 2>&1; then
                    xdg-open "${docs-html}/share/doc/nixcord/index.xhtml"
                  elif command -v open >/dev/null 2>&1; then
                    open "${docs-html}/share/doc/nixcord/index.xhtml"
                  else
                    echo "Documentation available at: ${docs-html}/share/doc/nixcord/index.xhtml"
                  fi
                '';
            in
            pkgs.writeShellScript "open-docs" script;
        };
      });

      homeModules = {
        default = inputs.self.homeModules.nixcord;
        nixcord = ./modules/hm-module.nix;
      };

    };
}
