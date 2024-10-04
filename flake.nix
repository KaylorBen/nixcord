{
  inputs.flake-compat.url = "https://flakehub.com/f/edolstra/flake-compat/1.tar.gz";
  outputs = { self, nixpkgs }:
    {
      homeManagerModules.nixcord = import ./hm-module.nix;
    };
}
