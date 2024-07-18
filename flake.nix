{
  description = "Nixcord is a set of declarative options for Vencord and Nix";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {self}:
  {
    homeManagerModules.default = import ./hm-module.nix self;
  };
}
