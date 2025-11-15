{ lib, parseRules, ... }:
let
  inherit (lib)
    attrsets
    findFirst
    lists
    strings
    ;

  inherit (attrsets)
    mapAttrs'
    nameValuePair
    ;

  defaultParseRules = import ../plugins/parse-rules.nix;

  mergeLists = base: extra: lists.unique (base ++ extra);

  upperNames = mergeLists defaultParseRules.upperNames parseRules.upperNames;
  lowerPluginTitles = mergeLists defaultParseRules.lowerPluginTitles parseRules.lowerPluginTitles;

  mergeFakeEnumList =
    name: mergeLists (defaultParseRules.fakeEnums.${name} or [ ]) (parseRules.fakeEnums.${name} or [ ]);

  fakeEnums = {
    zero = mergeFakeEnumList "zero";
    one = mergeFakeEnumList "one";
    two = mergeFakeEnumList "two";
    three = mergeFakeEnumList "three";
    four = mergeFakeEnumList "four";
  };

  isLowerCase = s: strings.toLower s == s;

  unNixify =
    nixName:
    strings.toUpper (
      strings.concatStrings (
        builtins.map (char: if isLowerCase char then char else "_" + char) (
          strings.stringToCharacters nixName
        )
      )
    );

  isLowerCamel = string: isLowerCase (builtins.substring 0 1 string);

  toUpper =
    string:
    strings.concatStrings [
      (strings.toUpper (builtins.substring 0 1 string))
      (builtins.substring 1 (builtins.stringLength string) string)
    ];

  specialRenames = {
    enable = "enabled";
    tagSettings = "tagSettings";
    useQuickCss = "useQuickCSS";
    webRichPresence = "WebRichPresence (arRPC)";
  };

  normalizeName =
    name: value:
    if specialRenames ? ${name} then
      specialRenames.${name}
    else if builtins.elem name upperNames then
      unNixify name
    else if builtins.elem name lowerPluginTitles then
      name
    else if builtins.isAttrs value && value ? enable && isLowerCamel name then
      toUpper name
    else
      name;

  fakeEnumMapping = [
    {
      values = fakeEnums.zero;
      mapped = 0;
    }
    {
      values = fakeEnums.one;
      mapped = 1;
    }
    {
      values = fakeEnums.two;
      mapped = 2;
    }
    {
      values = fakeEnums.three;
      mapped = 3;
    }
    {
      values = fakeEnums.four;
      mapped = 4;
    }
  ];

  applyFakeEnum =
    value:
    if builtins.typeOf value != "string" then
      value
    else
      let
        matched = findFirst (entry: builtins.elem value entry.values) null fakeEnumMapping;
      in
      if matched == null then value else matched.mapped;

  normalizeScalar = value: applyFakeEnum value;

  mkVencordCfg =
    cfg:
    mapAttrs' (
      name: value:
      let
        normalizedValue = if builtins.isAttrs value then mkVencordCfg value else normalizeScalar value;
      in
      nameValuePair (normalizeName name value) normalizedValue
    ) cfg;

  mkFinalPackages =
    {
      cfg,
      vencord,
      equicord,
    }:
    {
      discord = cfg.discord.package.override {
        withVencord = cfg.discord.vencord.enable;
        withEquicord = cfg.discord.equicord.enable;
        withOpenASAR = cfg.discord.openASAR.enable;
        enableAutoscroll = cfg.discord.autoscroll.enable;
        branch = cfg.discord.branch;
        vencord = if cfg.discord.vencord.enable then vencord else null;
        equicord = if cfg.discord.equicord.enable then equicord else null;
      };

      vesktop = cfg.vesktop.package.override {
        withSystemVencord = cfg.vesktop.useSystemVencord;
        withMiddleClickScroll = cfg.vesktop.autoscroll.enable;
        inherit vencord;
      };

      dorion = cfg.dorion.package;
    };
in
{
  inherit mkVencordCfg mkFinalPackages;
}
