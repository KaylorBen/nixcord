{
  outputs = { self }:
  {
    homeManagerModules.nixcord = import ./hm-module.nix;
  };
}
