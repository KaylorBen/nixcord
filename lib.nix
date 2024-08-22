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

  upperNames = [  # these are option names to become UPPER_SNAKE_CASE
    "webhook"
    "owner"
    "administrator"
    "moderatorStaff"
    "moderator"
    "voiceModerator"
    "chatModerator"
  ];

  lowerPluginTitles = [ # these are the only plugins with lowercase names in json
    "iLoveSpam"
    "moyai"
    "petpet"
  ];

  # this is a really bad solution to this problem, but no matter what all
  # solutions to it are bad
  # this is since many json options in Vencord are just int values with no description
  # ALL OF THESE HAVE TO BE UNIQUE!!!
  zeroOptions = [       # options which evaluate to int 0
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
    "preferPronounDB"
    "disabled"
    "compact"
    "plain"
  ];
  oneOptions = [       # options which evaluate to int 1
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
  ];
  twoOptions = [       # options which evaluate to int 2
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
  ];
  threeOptions = [       # options which evaluate to int 3
    "watching"
    "customTime"
    "serverDefault"
    "both"    # This references 2 options that both = 3 in JSON
  ];
  fourOptions = [
    "competing"
  ];

  isLowerCase = s: strings.toLower s == s;

  unNixify = nixName: (
    strings.toUpper (strings.concatStrings (builtins.map (char:
      if (isLowerCase char) then char
      else "_" + char
    ) (strings.stringToCharacters nixName)
  )));

  isLowerCamel = string: (
    isLowerCase (builtins.substring 0 1 string)
  );

  toUpper = string: (
    strings.concatStrings [
      (strings.toUpper (builtins.substring 0 1 string))
      (builtins.substring 1 (builtins.stringLength string) string)
    ]
  );

  mkVencordCfg = cfg:
  let
    recurse = mapAttrs' (name: value: nameValuePair
      (
        # probably some kind of map function is better than this
        if name == "enable" then "enabled" else
        if name == "tagSettings" then "tagSettings" else  # the only name that = attrset not in upperNames
        if name == "nsfwGateBypass" then "NSFWGateBypass" else # acronym needs special rule
        if name == "banger" then "BANger" else
        if name == "useQuickCss" then "useQuickCSS" else
        if name == "webRichPresence" then "WebRichPresence (arRPC)" else
        if builtins.elem name upperNames then unNixify name else
        if builtins.elem name lowerPluginTitles then name else
        if builtins.isAttrs value
          && builtins.hasAttr "enable" value
          && isLowerCamel name then toUpper name else
        name
      )
      (
        if builtins.isAttrs value then recurse value else # recurse into subsequent attrs
        if builtins.elem value zeroOptions then 0 else # no concievable way to generalize
        if builtins.elem value oneOptions then 1 else  # these without an upstream
        if builtins.elem value twoOptions then 2 else  # change at Vencord since
        if builtins.elem value threeOptions then 3 else# these settings enums are
        if builtins.elem value fourOptions then 4 else # completely arbitrary
        value
      )
    );
  in recurse cfg;
in
{
  inherit
    mkVencordCfg
    ;
}
