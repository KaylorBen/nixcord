{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-compat.url = "https://flakehub.com/f/edolstra/flake-compat/1.tar.gz";
  };

  outputs = inputs: {
    homeManagerModules = inputs.nixpkgs.lib.mapAttrs (
      name:
      inputs.nixpkgs.lib.warn "Obsolete Flake attribute `nixcord.homeManagerModules.${name}' is used. It was renamed to `nixcord.homeModules.${name}`'."
    ) inputs.self.homeModules;

    homeModules = {
      default = inputs.self.homeModules.nixcord;
      nixcord = import ./hm-module.nix;
    };
  };
}
