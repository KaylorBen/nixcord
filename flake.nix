{
  outputs = { self }:
  {
    homeManagerModules.nixcord = import ./hm-module.nix;
    nixosModule = self.nixosModuleshome-manager.nixcord;
  };
}
