{ lib, parseRules, ... }:
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
    # these are option names to become UPPER_SNAKE_CASE
    "webhook"
    "owner"
    "administrator"
    "moderatorStaff"
    "moderator"
    "voiceModerator"
    "chatModerator"
    "skipHostUpdate"
    "dangerousEnableDevtoolsOnlyEnableIfYouKnowWhatYoureDoing"
    "minWidth"
    "minHeight"
    "isMaximized"
    "isMinimized"
    "windowBounds"
    "openOnStartup"
    "minimizeToTray"
  ] ++ parseRules.upperNames;

  lowerPluginTitles = [
    # these are the only plugins with lowercase names in json
    "iLoveSpam"
    "petpet"
  ] ++ parseRules.lowerPluginTitles;

  # this is since many json options in Vencord are just int values with no description
  # ALL OF THESE HAVE TO BE UNIQUE!!!
  zeroOptions = [
    # options which evaluate to int 0
    "randomCharacters"
    "never"
    "playing"
    "none"
    "everything"
    "all"
    "recentlyActive"
    "normal"
    "highestRole"
    "mostRecent"
    "disabled"
    "compact"
    "plain"
    "whitelist"
  ] ++ parseRules.fakeEnums.zero;
  oneOptions = [
    # options which evaluate to int 1
    "consistent"
    "always"
    "streaming"
    "discordUptime"
    "titles"
    "only@Mentions"
    "list"
    "datePosted"
    "better"
    "lowestRole"
    "custom"
    "preferDiscord"
    "enabled"
    "onlyServerCount"
    "cozy"
    "muted"
    "animatedDots"
    "blacklist"
  ] ++ parseRules.fakeEnums.one;
  twoOptions = [
    # options which evaluate to int 2
    "timestamp"
    "moreThanOne"
    "listening"
    "currentTime"
    "thumbnails"
    "nothing"
    "gallery"
    "projectX"
    "followNoReplyMention"
    "onlyFriendCount"
    "roomy"
    "avatars"
  ] ++ parseRules.fakeEnums.two;
  threeOptions = [
    # options which evaluate to int 3
    "watching"
    "customTime"
    "serverDefault"
    "both" # This references 2 options that both = 3 in JSON
  ] ++ parseRules.fakeEnums.three;
  fourOptions = [
    "competing"
  ] ++ parseRules.fakeEnums.four;

  isLowerCase = s: strings.toLower s == s;

  unNixify =
    nixName:
    (strings.toUpper (
      strings.concatStrings (
        builtins.map (char: if (isLowerCase char) then char else "_" + char) (
          strings.stringToCharacters nixName
        )
      )
    ));

  isLowerCamel = string: (isLowerCase (builtins.substring 0 1 string));

  toUpper =
    string:
    (strings.concatStrings [
      (strings.toUpper (builtins.substring 0 1 string))
      (builtins.substring 1 (builtins.stringLength string) string)
    ]);

  mkVencordCfg =
    cfg:
    let
      recurse = mapAttrs' (
        name: value:
        nameValuePair
          (
            # probably some kind of map function is better than this
            if name == "enable" then
              "enabled"
            else if name == "tagSettings" then
              "tagSettings"
            # the only name that = attrset not in upperNames
            else if name == "nsfwGateBypass" then
              "NSFWGateBypass"
            # acronym needs special rule
            else if name == "banger" then
              "BANger"
            else if name == "useQuickCss" then
              "useQuickCSS"
            else if name == "webRichPresence" then
              "WebRichPresence (arRPC)"
            else if builtins.elem name upperNames then
              unNixify name
            else if builtins.elem name lowerPluginTitles then
              name
            else if builtins.isAttrs value && builtins.hasAttr "enable" value && isLowerCamel name then
              toUpper name
            else
              name
          )
          (
            if builtins.isAttrs value then
              recurse value
            # recurse into subsequent attrs
            else if builtins.elem value zeroOptions then
              0
            # no concievable way to generalize
            else if builtins.elem value oneOptions then
              1
            # these without an upstream
            else if builtins.elem value twoOptions then
              2
            # change at Vencord since
            else if builtins.elem value threeOptions then
              3
            # these settings enums are
            else if builtins.elem value fourOptions then
              4
            # completely arbitrary
            else
              value
          )
      );
    in
    recurse cfg;
in
{
  inherit
    mkVencordCfg
    ;
}
