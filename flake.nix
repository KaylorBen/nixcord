{
  outputs = { self }:
  {
    nixosModules.home-manager.nixcord = import ./hm-module.nix;
    nixosModule = self.nixosModuleshome-manager.nixcord;
  };
}
