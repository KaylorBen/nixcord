{ lib }:
let
  inherit (lib)
    attrsets
    strings
    ;

  inherit (attrsets)
    mapAttrs'
    nameValuePair
    ;

  upperNames = [
    "webhook"
    "owner"
    "administrator"
    "moderatorStaff"
    "moderator"
    "voiceModerator"
    "chatModerator"
  ];

  isLowerCase = char: (
    builtins.elem char [ "a" "b" "c" "d" "e" "f" "g" "h" "i" "j" "k" "l" "m" 
                         "n" "o" "p" "q" "r" "s" "t" "u" "v" "w" "x" "y" "z"]
  );

  unNixify = nixName: (
    strings.toUpper strings.concatStrings builtins.map (char:
      if (isLowerCase char) then char
      else "_" + char
    ) (strings.stringToCharacters nixName)
  );

  isLowerCamel = string: (
    isLowerCase (builtins.substring 0 1 string)
  );

  toUpper = string: (
    strings.concatStrings [
      (strings.toUpper (builtins.substring 0 1 string))
      (builtins.substring 1 (builtins.stringLength string) string)
    ]
  );

  mkVencordCfg = cfg: mapAttrs' (name: value: nameValuePair
    (
      if name == "enable" then "enabled" else
      if name == "tagSettings" then "tagSettings" else  # the only name that = attrset not in upperNames
      if builtins.elem name upperNames then unNixify name else
      if isLowerCamel name && builtins.isAttrs value then toUpper name else
      name
    )
    (value)
  ) cfg;
in
{
  inherit
    mkVencordCfg
    ;
}
