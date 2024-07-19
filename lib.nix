{ lib }:
let
  inherit (lib)
    attrsets
    ;

  inherit (attrsets)
    mapAttrs'
    nameValuePair
    ;

  mkVencordCfg = cfg: mapAttrs' (name: value: nameValuePair
    (if name == "enabled" then "enable" else name )
    (value)
  ) cfg;
in
{
  inherit
    mkVencordCfg
    ;
}
