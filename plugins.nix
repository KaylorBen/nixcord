{lib, ...}:
with lib;
{
  ChatInputButtonAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  CommandsAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  MemberListDecoratorsAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  MessageAccessoriesAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  MessageDecorationsAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  MessageEventsAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  MessagePopoverAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  MessageUpdaterAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  ServerListAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  UserSettingsAPI.enabled = mkOption {
    type = types.bool;
    default = true;
  };
  AlwaysAnimate = {
    enabled = mkEnableOption ''
      Animates anything that can be animated
    '';
  };
  AlwaysTrust = {
    enabled = mkEnableOption ''
      Removes the annoying untrusted domain and suspicious file popup
    '';
    domain = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Remove the untrusted domain popup when opening links
      '';
    };
    file = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Remove the 'Potentially Dangerous Download' popup when opening links
      '';
    };
  };
  AnonymiseFileNames = {
    enabled = mkEnableOption ''
      Anonymise uploaded file names
    '';
    anonymiseByDefault = mkEnableOption ''
      Whether to anonymise file names by default
    '';
    method = mkOption {
      type = types.int;
      default = 0;
      description = ''
        Anonymising Method
        0 - Random Characters
        1 - Consistent
        2 - Timestamp
      '';
    };
    randomisedLength = mkOption {
      type = types.int;
      default = 7;
      description = ''
        Whether to anonymise file names by default
      '';
    };
    consistent = mkOption {
      type = types.str;
      default = "image";
      description = ''
        Consistent Filename
      '';
    };
  };
  AppleMusicRichPresence = {
    # Darwin is not offically supported, still could work
    enabled = mkEnableOption ''
      Apple music rich presence integration
    '';
  };
  AutomodContext = {
    enabled = mkEnableOption ''
      Allows you to jump to the messages surrounding an automod hit
    '';
  };
  BANger = {
    enabled = mkEnableOption ''
      Replaces the GIF in the ban dialogue with a custom one.
    '';
    source = mkOption {
      type = types.str;
      default = "https://i.imgur.com/wp5q52C.mp4";
      description = ''
        Source to replace ban GIF with (Video or Gif)
      '';
    };
  };
  BetterFolders = {
    enabled = mkEnableOption ''
      Shows server folders on dedicated sidebar and adds folder related improvements
    '';
    sidebar = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Display servers from folder on dedicated sidebar
      '';
    };
    sidebarAnim = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Animate opening the folder sidebar
      '';
    };
    closeAllFolders = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Close all folders when selecting a server not in a folder
      '';
    };
    closeAllHomeButton = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Close all folders when clicking on the home button
      '';
    };
    closeOthers = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Close other folders when opening a folder
      '';
    };
    forceOpen = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Force a folder to open when switching to a server of that folder
      '';
    };
    keepIcons = mkOption {
      type = types.bool;
      default = false;
      description = ''
        Keep showing guild icons in the primary guild bar folder when it
      's open in the BetterFolders sidebar'';
    };
    showFolderIcon = mkOption{
      type = types.int;
      default = 0;
      description = ''
        Show the folder icon above the folder guilds in the BetterFolders sidebar
        0 - Never
        1 - Always
        2 - When more than one folder is expanded
      '';
    };
  };
  BetterGifAltText = {
    enabled = mkEnableOption ''
      Change GIF alt text from simply being 'GIF' to containing the gif tags / filename
    '';
  };
  BetterGifPicker = {
    enabled = mkEnableOption ''
      Makes the gif picker open the favourite category by default
    '';
  };
  BetterNotesBox = {
    enabled = mkEnableOption ''
      Hide notes or disable spellcheck (Configure in settings!!)
    '';
    hide = mkEnableOption ''
      Hide notes
    '';
    noSpellCheck = mkEnableOption ''
      Disable spellcheck in notes
    '';
  };
  BetterRoleContext = {
    enabled = mkEnableOption ''
      Adds options to copy role color / edit role / view role icon when right clicking roles in the user profile
    '';
    roleIconFileFormat = mkOption {
      type = types.str;
      default = "png";
      example = "webp";
      description = "File format to use when viewing role icons";
    };
  };
  BetterRoleDot = {
    enabled = mkEnableOption ''
      Copy role color on RoleDot (accessibility setting) click.
      Also allows using both RoleDot and colored names simultaneously
    '';
    bothStyles = mkEnableOption ''
      Show both role dot and coloured names
    '';
    copyRoleColorInProfilePopout = mkEnableOption ''
      Allow click on role dot in profile popout to copy role color
    '';
  };
  BetterSessions = {
    enabled = mkEnableOption ''
      Enhances the sessions (devices) menu. Allows you to view exact timestamps,
      give each session a custom name, and receive notifications about new sessions.
    '';
    backgroundCheck = mkEnableOption ''
      Check for new sessions in the background, and display notifications when they are detected
    '';
    checkInterval = mkOption {
      type = types.int;
      default = 20;
      description = ''
        How often to check for new sessions in the background (if enabled), in minutes
      '';
    };
  };
  BetterSettings = {
    enabled = mkEnableOption ''
      Enhances your settings-menu-opening experience
    '';
    disableFade = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Disable the crossfade animation
      '';
    };
    organizeMenu = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Organizes the settings cog context menu into categories
      '';
    };
    eagerLoad = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Removes the loading delay when opening the menu for the first time
      '';
    };
  };
  BetterUploadButton = {
    enabled = mkEnableOption ''
      Upload with a single click, open menu with right click
    '';
  };
  BiggerStreamPreview = {
    enabled = mkEnableOption ''
      This plugin allows you to enlarge stream previews
    '';
  };
  BlurNSFW = {
    enabled = mkEnableOption ''
      Blur attachments in NSFW channels until hovered
    '';
    blurAmount = mkOption {
      type = types.int;
      default = 10;
      description = ''
        Blur Amount
      '';
    };
  };
  CallTimer = {
    enabled = mkEnableOption ''
      Adds a timer to vcs
    '';
    format = mkOption {
      type = types.str;
      default = "stopwatch";
      example = "human";
      description = ''
        The timer format. This can be any valid moment.js format
      '';
    };
  };
  ClearURLs = {
    enabled = mkEnableOption ''
      Removes tracking garbage from URLs
    '';
  };
  ClientTheme = {
    enabled = mkEnableOption ''
      Recreation of the old client theme experiment. Add a color to your Discord client theme
    '';
    color = mkOption {
      type = types.str;
      default = "313338";
      example = "184ed6";
      description = ''
        Color your Discord client theme will be based around. Light mode isn't supported
        RGB hex color as a plain number string
      '';
    };
  };
  ColorSighted = {
    enabled = mkEnableOption ''
      Removes the colorblind-friendly icons from statuses, just like 2015-2017 Discord
    '';
  };
  ConsoleJanitor = {
    enabled = mkEnableOption ''
      Disables annoying console messages/errors
    '';
    disableNoisyLoggers = mkEnableOption ''
      Disable noisy loggers like the MessageActionCreators
    '';
    disableSpotifyLogger = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Disable the Spotify logger, which leaks account information and access token
      '';
    };
  };
  ConsoleShortcuts = {
    enabled = mkEnableOption ''
      Adds shorter Aliases for many things on the window. Run `shortcutList` for a list.
    '';
  };
  CopyEmojiMarkdown = {
    enabled = mkEnableOption ''
      Allows you to copy emojis as formatted string (<:blobcatcozy:1026533070955872337>)
    '';
    copyUnicode = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Copy the raw unicode character instead of :name: for default emojis (👽)
      '';
    };
  };
  CopyUserURLs = {
    enabled = mkEnableOption ''
      Adds a 'Copy User URL' option to the user context menu.
    '';
  };
  CrashHandler = {
    enabled = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Utility plugin for handling and possibly recovering from crashes without a restart
      '';
    };
    attemptToPreventCrashes = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to attempt to prevent Discord crashes.
      '';
    };
    attemptToNavigateToHome = mkEnableOption ''
      Whether to attempt to navigate to the home when preventing Discord crashes
    '';
  };
  CtrlEnterSend = {
    enabled = mkEnableOption ''
      Use Ctrl+Enter to send messages (customizable)
    '';
    submitRule = mkOption {
      type = types.str;
      default = "ctrl+enter";
      example = "shift+enter";
      description = ''
        The way to send a message
      '';
    };
    sendMessageInTheMiddleOfACodeBlock = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to send a message in the middle of a code block
      '';
    };
  };
  CustomRPC = {
    enabled = mkEnableOption ''
      Allows you to set a custom rich presence.
    '';
    appID = mkOption {
      type = with types; nullOr str;
      default = null;
      example = "1316659";
      description = ''
        Application ID (required)
      '';
    };
    appName = mkOption {
      type = with types; nullOr str;
      default = null;
      example = "firefox";
      description = ''
        Application name (required)
        Application name must be not longer than 128 characters.
      '';
    };
    details = mkOption {
      type = with types; nullOr str;
      default = null;
      example = "A web browser";
      description = ''
        Details (line 1)
        Details (line 1) must be not longer than 128 characters.
      '';
    };
    state = mkOption {
      type = with types; nullOr str;
      default = null;
      example = "Browsing";
      description = ''
        State (line 2)
        State (line 2) must be not longer than 128 characters.
      '';
    };
    type = mkOption {
      type = types.int;
      default = 0;
      description = ''
        Activity type
        0 - Playing
        1 - Streaming
        2 - Listening
        3 - Watching
        4 - Competing
      '';
    };
    streamLink = mkOption {
      type = with types; nullOr str;
      default = null;
      description = ''
        Twitch.tv or Youtube.com link (only for Streaming activity type)
      '';
    };
    timestampMode = mkOption {
      type = types.int;
      default = 0;
      description = ''
        Timestamp mode
        0 - None
        1 - Since discord open
        2 - Same as your current time
        3 - Custom
      '';
    };
    startTime = mkOption {
      type = with types; nullOr int;
      default = null;
      description = ''
        Start timestamp in milliseconds (only for custom timestamp mode)
        Start timestamp must be greater than 0.
      '';
    };
    endTime = mkOption {
      type = with types; nullOr int;
      default = null;
      description = ''
        End timestamp in milliseconds (only for custom timestamp mode)
        End timestamp must be greater than 0.
      '';
    };
    imageBig = mkOption {
      type = types.str;
      default = "";
      description = ''
        Big image key/link
      '';
    };
    imageBigTooltip = mkOption {
      type = types.str;
      default = "";
      description = ''
        Big image tooltip
        Big image tooltip must be not longer than 128 characters.
      '';
    };
    imageSmall = mkOption {
      type = types.str;
      default = "";
      description = ''
        Small image key/link
      '';
    };
    imageSmallTooltip = mkOption {
      type = types.str;
      default = "";
      description = ''
        Small image tooltip
        Small image tooltip must be not longer than 128 characters.
      '';
    };
    buttonOneText = mkOption {
      type = types.str;
      default = "";
      description = ''
        Button 1 text
        Button 1 text must be not longer than 31 characters.
      '';
    };
    buttonOneURL = mkOption {
      type = types.str;
      default = "";
      description = ''
        Button 1 URL
      '';
    };
    buttonTwoText = mkOption {
      type = types.str;
      default = "";
      description = ''
        Button 2 text
        Button 2 text must be not longer than 31 characters.
      '';
    };
    buttonTwoURL = mkOption {
      type = types.str;
      default = "";
      description = ''
        Button 2 URL
      '';
    };
  };
  CustomIdle = {
    enabled = mkEnableOption ''
      Allows you to set the time before Discord goes idle (or disable auto-idle)
    '';
    idleTimeout = mkOption {
      type = types.float;
      default = 10.0;
      description = ''
        Minutes before Discord goes idle (0 to disable auto-idle)
      '';
    };
    remainInIdle = mkOption {
      type = types.bool;
      default = true;
      description = ''
        When you come back to Discord, remain idle until you confirm you want to go online
      '';
    };
  };
  Dearrow = {
    enabled = mkEnableOption ''
      Makes YouTube embed titles and thumbnails less sensationalist, powered by Dearrow
    '';
    hideButton = mkEnableOption ''
      Hides the Dearrow button from YouTube embeds
    '';
    replaceElements = mkOption {
      type = types.int;
      default = 0;
      description = ''
        Choose which elements of the embed will be replaced
        0 - Everything (Titles & Thumbnails)
        1 - Titles
        2 - Thumbnails
      '';
    };
  };
  Decor = {
    enabled = mkEnableOption ''
      Create and use your own custom avatar decorations, or pick your favorite from the presets.
    '';
  };
  DisableCallIdle = {
    enabled = mkEnableOption ''
      Disables automatically getting kicked from a DM voice call after 3 minutes
      and being moved to an AFK voice channel.
    '';
  };
  DontRoundMyTimestamps = {
    enabled = mkEnableOption ''
      Always rounds relative timestamps down, so 7.6y becomes 7y instead of 8y
    '';
  };
  EmoteCloner = {
    enabled = mkEnableOption ''
      Allows you to clone Emotes & Stickers to your own server (right click them)
    '';
  };
  Experiments = {
    enabled = mkEnableOption ''
      Enable Access to Experiments & other dev-only features in Discord!
    '';
    toolbarDevMenu = mkEnableOption ''
      Change the Help (?) toolbar button (top right in chat) to Discord's developer menu
    '';
  };
  F8Break = {
    enabled = mkEnableOption ''
      Pause the client when you press F8 with DevTools (+ breakpoints) open.
    '';
  };
  FakeNitro = {
    enabled = mkEnableOption ''
      Allows you to stream in nitro quality, send fake emojis/stickers,
      use client themes and custom Discord notifications.
    '';
    enableEmojiBypass = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Allows sending fake emojis (also bypasses missing permission to use custom emojis)
      '';
    };
    emojiSize = mkOption {
      type = types.int;
      default = 48;
      example = 128;
      description = ''
        Size of the emojis when sending
      '';
    };
    transformEmojis = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to transform fake emojis into real ones
      '';
    };
    enableStickerBypass = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Allows sending fake stickers (also bypasses missing permission to use stickers)
      '';
    };
    stickerSize = mkOption {
      type = types.int;
      default = 160;
      example = 256;
      description = ''
        Size of the stickers when sending
      '';
    };
    transformSitckers = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to transform fake stickers into real ones
      '';
    };
    transformCompoundSentence = mkEnableOption ''
      Whether to transform fake stickers and emojis in compound sentences
      (sentences with more content than just the fake emoji or sticker link)
    '';
    enableStreamQualityBypass = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Allow streaming in nitro quality
      '';
    };
    useHyperLinks = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to use hyperlinks when sending fake emojis and stickers
      '';
    };
    hyperLinkText = mkOption {
      type = types.str;
      default = "{{NAME}}";
      description = ''
        What text the hyperlink should use.
        {{NAME}} will be replaced with the emoji/sticker name.
      '';
    };
    disableEmbedPermissionCheck = mkEnableOption ''
      Whether to disable the embed permission check when sending fake emojis and stickers
    '';
  };
  FakeProfileThemes = {
    enabled = mkEnableOption ''
      Allows profile theming by hiding the colors in your bio thanks to invisible 3y3 encoding
    '';
    nitroFirst = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Use Nitro color source first if both are present
      '';
    };
  };
  FavoriteEmojiFirst = {
    enabled = mkEnableOption ''
      Puts your favorite emoji first in the emoji autocomplete.
    '';
  };
  FavoriteGifSearch = {
    enabled = mkEnableOption ''
      Adds a search bar to favorite gifs. 
    '';
    searchOption = mkOption {
      type = types.str;
      default = "hostandpath";
      example = "url";
      description = ''
        The part of the url you want to search
        url - Entire Url
        path - Path Only (/somegif.gif)
        hostandpath - Host & Path (tenor.com somgif.gif)
      '';
    };
  };
  FixCodeblockGap = {
    enabled = mkEnableOption ''
      Removes the gap between codeblocks and text below it
    '';
  };
  FixSpotifyEmbeds = {
    enabled = mkEnableOption ''
      Fixes spotify embeds being incredibly loud by letting you customise the volume
    '';
    volume = mkOption {
      type = types.float;
      default = 10.0;
      description = ''
        The volume % to set for spotify embeds. Anything above 10% is veeeery loud
      '';
    };
  };
  FixYoutubeEmbeds = {
    enabled = mkEnableOption ''
      Bypasses youtube videos being blocked from display on Discord (for example by UMG)
    '';
  };
  ForceOwnerCrown = {
    enabled = mkEnableOption ''
      Force the owner crown next to usernames even if the server is large.
    '';
  };
  FriendInvites = {
    enabled = mkEnableOption ''
      Create and manage friend invite links via slash commands
      (/create friend invite, /view friend invites, /revoke friend invites).
    '';
  };
  FriendsSince = {
    enabled = mkEnableOption ''
      Shows when you became friends with someone in the user popout
    '';
  };
  GameActivityToggle = {
    enabled = mkEnableOption ''
      Adds a button next to the mic and deafen button to toggle game activity.
    '';
    oldIcon = mkEnableOption ''
      Use the old icon style before Discord icon redesign
    '';
  };
  GifPaste = {
    enabled = mkEnableOption ''
      Makes picking a gif in the gif picker insert a link into the chatbox instead of instantly sending it
    '';
  };
  GreetStickerPicker = {
    enabled = mkEnableOption ''
      Allows you to use any greet sticker instead of only the
      random one by right-clicking the 'Wave to say hi!' button
    '';
    greetMode = mkOption {
      type = types.str;
      default = "Greet";
      example = "Message";
      description = ''
        Choose the greet mode
        Greet - Greet (you can only greet 3 times)
        Message - Normal Message (you can greet spam)
      '';
    };
  };
  HideAttachments = {
    enabled = mkEnableOption ''
      Hide attachments and Embeds for individual messages via hover button
    '';
  };
  iLoveSpam = {
    enabled = mkEnableOption ''
      Do not hide messages from 'likely spammers'
    '';
  };
  IgnoreActivities = {
    enabled = mkEnableOption ''
      Ignore activities from showing up on your status ONLY.
      You can configure which ones are specifically ignored from the
      Registered Games and Activities tabs, or use the general settings below.
    '';
    allowedIds = mkOption {
      type = types.str;
      default = "";
      example = "235834946571337729, 343383572805058560";
      description = ''
        Comma separated list of activity IDs to allow (Useful for allowing RPC activities and CustomRPC)
      '';
    };
    ignorePlaying = mkEnableOption ''
      Ignore all playing activities (These are usually game and RPC activities)
    '';
    ignoreStreaming = mkEnableOption ''
      Ignore all streaming activities
    '';
    ignoreListening = mkEnableOption ''
      Ignore all listening activities (These are usually spotify activities)
    '';
    ignoreWatching = mkEnableOption ''
      Ignore all watching activities
    '';
    ignoreCompeting = mkEnableOption ''
      Ignore all competing activities (These are normally special game activities)
    '';
  };
  ImageLink = {
    enabled = mkEnableOption ''
      Never hide image links in messages, even if it's the only content
    '';
  };
  ImageZoom = {
    enabled = mkEnableOption ''
      Lets you zoom in to images and gifs.
      Use scroll wheel to zoom in and shift + scroll wheel to increase lens radius / size
    '';
    saveZoomValues = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to save zoom and lens size values
      '';
    };
    invertScroll = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Invert scroll
      '';
    };
    nearestNeighbour = mkEnableOption ''
      Use Nearest Neighbour Interpolation when scaling images
    '';
    square = mkEnableOption ''
      Make the lens square
    '';
    zoom = mkOption {
      type = types.float;
      default = 2.0;
      description = ''
        Zoom of the lens
      '';
    };
    size = mkOption {
      type = types.float;
      default = 100.0;
      description = ''
        Radius / Size of the lens
      '';
    };
    zoomSpeed = mkOption {
      type = types.float;
      default = 0.5;
      description = ''
        How fast the zoom / lens size changes
      '';
    };
  };
  ImplicitRelationships = {
    enabled = mkEnableOption ''
      Shows your implicit relationships in the Friends tab.
    '';
    sortByAffinity = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to sort implicit relationships by their affinity to you.
      '';
    };
  };
  InvisibleChat = {
    enabled = mkEnableOption ''
      Encrypt your Messages in a non-suspicious way!
    '';
    savedPasswords = mkOption {
      type = types.str;
      default = "password, Password";
      description = ''
        Saved Passwords (Seperated with a , )
      '';
    };
  };
  KeepCurrentChannel = {
    enabled = mkEnableOption ''
      Attempt to navigate to the channel you were in before switching accounts or loading Discord.
    '';
  };
  LastFMRichPresence = {
    enabled = mkEnableOption ''
      Little plugin for Last.fm rich presence
    '';
    username = mkOption {
      type = types.str;
      default = "";
      description = ''
        last.fm username
      '';
    };
    apiKey = mkOption {
      type = types.str;
      default = "";
      description = ''
        last.fm api key
      '';
    };
    shareUsername = mkEnableOption ''
      show link to last.fm profile
    '';
    shareSong = mkOption {
      type = types.bool;
      default = true;
      description = ''
        show link to song on last.fm
      '';
    };
    hideWithSpotify = mkOption {
      type = types.bool;
      default = true;
      description = ''
        hide last.fm presence if spotify is running
      '';
    };
    statusName = mkOption {
      type = types.str;
      default = "some music";
      description = ''
        custom status text
      '';
    };
    nameFormat = mkOption {
      type = types.str;
      default = "status-name";
      example = "artist-first";
      description = ''
        Show name of song and artist in status name
        status-name - Use custom status name
        artist-first - Use format 'artist - song'
        song-first - Use format 'song - artist'
        artist - Use artist name only
        song - Use song name only
        album - Use album name (falls back to custom status text if song has no album)
      '';
    };
    useListeningStatus = mkEnableOption ''
      show "Listening to" status instead of "Playing"
    '';
    missingArt = mkOption {
      type = types.str;
      default = "lastfmLogo";
      example = "placeholder";
      description = ''
        When album or album art is missing
        lastfmLogo - Use large Last.fm logo
        placeholder - Use generic placeholder
      '';
    };
    showLastFmLogo = mkOption {
      type = types.bool;
      default = true;
      description = ''
        show the Last.fm logo by the album cover
      '';
    };
  };
  LoadingQuotes = {
    enabled = mkEnableOption ''
      Replace Discords loading quotes
    '';
    replaceEvents = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Should this plugin also apply during events with special event themed quotes? (e.g. Halloween)
      '';
    };
    enablePluginPresetQuotes = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Enable the quotes preset by this plugin
      '';
    };
    enableDiscordPresetQuotes = mkEnableOption ''
      Enable Discord's preset quotes (including event quotes, during events)
    '';
    additionalQuotes = mkOption {
      type = types.str;
      default = "";
      example = "This is a quote|This is another";
      description = ''
        Additional custom quotes to possibly appear, separated by additionalQuotesDelimiter
      '';
    };
    additionalQuotesDelimiter = mkOption {
      type = types.str;
      default = "|";
      description = ''
        Delimiter for additional quotes
      '';
    };
  };
  MaskedLinkPaste = {
    enabled = mkEnableOption ''
      Pasting a link while having text selected will paste a hyperlink
    '';
  };
  MemberCount = {
    enabled = mkEnableOption ''
      Shows the amount of online & total members in the server member list and tooltip
    '';
    toolTip = mkOption {
      type = types.bool;
      default = true;
      description = ''
        If the member count should be displayed on the server tooltip
      '';
    };
    memberList = mkOption {
      type = types.bool;
      default = true;
      description = ''
        If the member count should be displayed on the member list
      '';
    };
  };
  MentionAvatars = {
    enabled = mkEnableOption ''
      Shows user avatars inside mentions
    '';
  };
  MessageClickActions = {
    enabled = mkEnableOption ''
      Hold Backspace and click to delete, double click to edit/reply
    '';
    enableDeleteOnClick = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Enable delete on click while holding backspace
      '';
    };
    enableDoubleClickToEdit = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Enable double click to edit
      '';
    };
    enableDoubleClickToReply = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Enable double click to reply
      '';
    };
    requireModifire = mkEnableOption ''
      Only do double click actions when shift/ctrl is held
    '';
  };
  MessageLatency = {
    enabled = mkEnableOption ''
      Displays an indicator for messages that took ≥n seconds to send
    '';
    latency = mkOption {
      type = types.int;
      default = 2;
      description = ''
        Threshold in seconds for latency indicator
      '';
    };
    detectDiscordKotlin = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Detect old Discord Android clients
      '';
    };
    showMillis = mkEnableOption ''
      Show milliseconds
    '';
  };
  MessageLinkEmbeds = {
    enabled = mkEnableOption ''
      Adds a preview to messages that link another message
    '';
    messageBackgroundColor = mkEnableOption ''
      Background color for messages in rich embeds
    '';
    automodEmbeds = mkOption {
      type = types.str;
      default = "never";
      example = "always";
      description = ''
        Use automod embeds instead of rich embeds (smaller but less info)
        always - Always use automod embeds
        prefer - Prefer automod embeds, but use rich embeds if some content can't be shown
        never - Never use automod embeds
      '';
    };
    listMode = mkOption {
      type = types.str;
      default = "blacklist";
      example = "whitelist";
      description = ''
        Whether to use ID list as blacklist or whitelist
      '';
    };
    idList = mkOption {
      type = types.str;
      default = "";
      example = "13, 4, 5";
      description = ''
        Guild/channel/user IDs to blacklist or whitelist (separate with comma)
      '';
    };
  };
  MessageLogger = {
    enabled = mkEnableOption ''
      Temporarily logs deleted and edited messages.
    '';
    deleteStyle = mkOption {
      type = types.str;
      default = "text";
      example = "overlay";
      description = ''
        The style of deleted messages
        text - Red text
        overlay - Red overlay
      '';
    };
    logDeletes = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to log deleted messages
      '';
    };
    collapseDeleted = mkEnableOption ''
      Whether to collapse deleted messages, similar to blocked messages
    '';
    logEdits = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to log edited messages
      '';
    };
    inlineEdits = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to display edit history as part of message content
      '';
    };
    ignoreBots = mkEnableOption ''
      Whether to ignore messages by bots
    '';
    ignoreSelf = mkEnableOption ''
      Whether to ignore messages by yourself
    '';
    ignoreUsers = mkOption {
      type = types.str;
      default = "";
      description = ''
        Comma-separated list of user IDs to ignore
      '';
    };
    ignoreChannels = mkOption {
      type = types.str;
      default = "";
      description = ''
        Comma-separated list of channel IDs to ignore
      '';
    };
    ignoreGuilds = mkOption {
      type = types.str;
      default = "";
      description = ''
        Comma-separated list of guild IDs to ignore
      '';
    };
  };
  MessageTags = {
    enabled = mkEnableOption ''
      Allows you to save messages and to use them with a simple command.
    '';
    clyde = mkOption {
      type = types.bool;
      default = true;
      description = ''
        If enabled, clyde will send you an ephemeral message when a tag was used.
      '';
    };
  };
  MoreCommands = {
    enabled = mkEnableOption ''
      echo, lenny, mock
    '';
  };
  MoreKaomoji = {
    enabled = mkEnableOption ''
      Adds more Kaomoji to discord. ヽ(´▽`)/
    '';
  };
  MoreUserTags = {
    enabled = mkEnableOption ''
      Adds tags for webhooks and moderative roles (owner, admin, etc.)
    '';
    dontShowForBots = mkEnableOption ''
      Don't show extra tags for bots (excluding webhooks)
    '';
    dontShowBotTag = mkEnableOption ''
      Only show extra tags for bots / Hide [BOT] text
    '';
    tagSettings = {
      WEBHOOK = {
        text = mkOption {
          type = types.str;
          default = "Webhook";
          description = ''
            Webhook tag
          '';
        };
        showInChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in messages
          '';
        };
        showInNotChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in member list and profiles
          '';
        };
      };
      OWNER = {
        text = mkOption {
          type = types.str;
          default = "Owner";
          description = ''
            Owner tag
          '';
        };
        showInChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in messages
          '';
        };
        showInNotChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in member list and profiles
          '';
        };
      };
      ADMINISTRATOR = {
        text = mkOption {
          type = types.str;
          default = "Admin";
          description = ''
            Admin tag
          '';
        };
        showInChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in messages
          '';
        };
        showInNotChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in member list and profiles
          '';
        };
      };
      MODERATOR_STAFF = {
        text = mkOption {
          type = types.str;
          default = "Staff";
          description = ''
            Staff tag
          '';
        };
        showInChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in messages
          '';
        };
        showInNotChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in member list and profiles
          '';
        };

      };
      MODERATOR = {
        text = mkOption {
          type = types.str;
          default = "Mod";
          description = ''
            Mod tag
          '';
        };
        showInChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in messages
          '';
        };
        showInNotChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in member list and profiles
          '';
        };
      };
      VOICE_MODERATOR = {
        text = mkOption {
          type = types.str;
          default = "VC Mod";
          description = ''
            VC mod tag
          '';
        };
        showInChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in messages
          '';
        };
        showInNotChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in member list and profiles
          '';
        };
      };
      CHAT_MODERATOR = {
        text = mkOption {
          type = types.str;
          default = "Chat Mod";
          description = ''
            Chat mod tag
          '';
        };
        showInChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in messages
          '';
        };
        showInNotChat = mkOption {
          type = types.bool;
          default = true;
          description = ''
            Show in member list and profiles
          '';
        };
      };
    };
  };
  Moyai = {
    # This plugin has meme descriptions. It plays a boom sound effect
    # when a certain emoji is sent. I've kept the descriptions of the original
    # for consistency, and to match the original repository
    enabled = mkEnableOption ''
      🗿🗿🗿🗿🗿🗿🗿🗿
    '';
    volume = mkOption {
      type = types.float;
      default = 0.5;
      description = ''
        Volume of the 🗿🗿🗿
      '';
    };
    quality = mkOption {
      type = types.str;
      default = "Normal";
      example = "HD";
      description = ''
        Quality of the 🗿🗿🗿
      '';
    };
    triggerWhenUnfocused = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Trigger the 🗿 even when the window is unfocused
      '';
    };
    ignoreBots = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Ignore bots
      '';
    };
    ignoreBlocked = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Ignore blocked users
      '';
    };
  };
  MutualGroupDMs = {
    enabled = mkEnableOption ''
      Shows mutual group dms in profiles
    '';
  };
  NewGuildSettings = {
    enabled = mkEnableOption ''
      Automatically mute new servers and change various other settings upon joining
    '';
    guild = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Mute Guild automatically
      '';
    };
    messages = mkOption {
      type = types.int;
      default = 3;
      description = ''
        Server Notification Settings
        0 - All messages
        1 - Only @mentions
        2 - Nothing
        3 - Server default
      '';
    };
    everyone = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Suppress @everyone and @here
      '';
    };
    role = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Suppress All Role @mentions
      '';
    };
    highlights = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Suppress Highlights automatically
      '';
    };
    events = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Mute New Events automatically
      '';
    };
    showAllChannels = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show all channels automatically
      '';
    };
  };
  NoBlockedMessages = {
    enabled = mkEnableOption ''
      Hides all blocked messages from chat completely.
    '';
    ignoreBlockedMessages = mkEnableOption ''
      Completely ignores (recent) incoming messages from blocked users (locally).
    '';
  };
  NoDefaultHangStatus = {
    enabled = mkEnableOption ''
      Disable the default hang status when joining voice channels
    '';
  };
  NoDevtoolsWarning = {
    enabled = mkEnableOption ''
      Disables the 'HOLD UP' banner in the console. As a side effect,
      also prevents Discord from hiding your token, which prevents random logouts.
    '';
  };
  NoF1 = {
    enabled = mkEnableOption ''
      Disables F1 help bind.
    '';
  };
  NoMosaic = {
    enabled = mkEnableOption ''
      Removes Discord new image mosaic
    '';
    inlineVideo = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Play videos without carousel modal
      '';
    };
  };
  NoOnboardingDelay = {
    enabled = mkEnableOption ''
      Skips the slow and annoying onboarding delay
    '';
  };
  NoPendingCount = {
    enabled = mkEnableOption ''
      Removes the ping count of incoming friend requests, message requests, and nitro offers.
    '';
    hideFriendRequestsCount = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Hide incoming friend requests count
      '';
    };
    hideMessageRequestCount = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Hide message requests count
      '';
    };
    hidePremiumOffersCount = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Hide nitro offers count
      '';
    };
  };
  NoProfileThemes = {
    enabled = mkEnableOption ''
      Completely removes Nitro profile themes
    '';
  };
  NoRPC = {
    enabled = mkEnableOption ''
      Disables Discord's RPC server.
    '';
  };
  NoReplyMention = {
    enabled = mkEnableOption ''
      Disables reply pings by default
    '';
    userList = mkOption {
      type = types.str;
      default = "";
      example = "1234567890123445 1234567890123445";
      description = ''
        List of users to allow or exempt pings for (separated by commas or spaces)
      '';
    };
    shouldPingListed = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether or not to ping or not ping the users in userList
      '';
    };
    inverseShiftReply = mkEnableOption ''
      Invert Discord's shift replying behaviour (enable to make shift reply mention user)
    '';
  };
  NoScreensharePreview = {
    enabled = mkEnableOption ''
      Disables screenshare previews from being sent.
    '';
  };
  NoServerEmojis = {
    enabled = mkEnableOption ''
      Do not show server emojis in the autocomplete menu.
    '';
    shownEmojis = mkOption {
      type = types.str;
      default = "onlyUnicode";
      example = "currentServer";
      description = ''
        The types of emojis to show in the autocomplete menu.
        onlyUnicode - Only unicode emojis
        currentServer - Unicode emojis and server emojis from current server
        all - Unicode emojis and all server emojis (Discord default)
      '';
    };
  };
  NoSystemBadge = {
    enabled = mkEnableOption ''
      Disables the taskbar and system tray unread count badge.
    '';
  };
  NoTypingAnimation = {
    enabled = mkEnableOption ''
      Disables the CPU-intensive typing dots animation
    '';
  };
  NoUnblockToJump = {
    enabled = mkEnableOption ''
      Allows you to jump to messages of blocked users without unblocking them
    '';
  };
  NormalizeMessageLinks = {
    enabled = mkEnableOption ''
      Strip canary/ptb from message links
    '';
  };
  NotificationVolume = {
    enabled = mkEnableOption ''
      Save your ears and set a separate volume for notifications and in-app sounds
    '';
    notificationVolume = mkOption {
      type = types.float;
      default = 100.0;
      description = ''
        Notification volume
      '';
    };
  };
  NSFWGateBypass = {
    enabled = mkEnableOption ''
      Allows you to access NSFW channels without setting/verifying your age
    '';
  };
  OnePingPerDM = {
    enabled = mkEnableOption ''
      If unread messages are sent by a user in DMs multiple times, you'll only receive one audio ping.
      Read the messages to reset the limit
    '';
    channelToAffect = mkOption {
      type = types.str;
      default = "both_dms";
      example = "user_dm";
      description = ''
        Select the type of DM for the plugin to affect
        both_dms - Both
        user_dm - User DMs
        group_dm - Group DMs
      '';
    };
    allowMentions = mkEnableOption ''
      Receive audio pings for @mentions
    '';
    allowEveryone = mkEnableOption ''
      Receive audio pings for @everyone and @here in group DMs
    '';
  };
  oneko = {
    enabled = mkEnableOption ''
      cat follow mouse (real)
    '';
  };
  OpenInApp = {
    enabled = mkEnableOption ''
      Open Spotify, Tidal, Steam and Epic Games URLs in their respective apps instead of your browser
    '';
    spotify = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Open Spotify links in the Spotify app
      '';
    };
    steam = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Open Steam links in the Steam app
      '';
    };
    epic = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Open Epic Games links in the Epic Games Launcher
      '';
    };
    tidal = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Open Tidal links in the Tidal app
      '';
    };
  };
  OverrideForumDefaults = {
    enabled = mkEnableOption ''
      Allows you to override default forum layout/sort order. you can still change it on a per-channel basis
    '';
    # I have no idea why this uses 1 based indexing, it is driving me crazy
    defaultLayout = mkOption {
      type = types.int;
      default = 1;
      description = ''
        Which layout to use as default
        1 - List
        2 - Gallery
      '';
    };
    defaultSortOrder = mkOption {
      type = types.int;
      default = 0;
      description = ''
        Which sort order to use as default
        0 - Recently Active
        1 - Date Posted
      '';
    };
  };
  PartyMode = {
    enabled = mkEnableOption ''
      Allows you to use party mode cause the party never ends ✨
    '';
    # This one apparently uses an enum in code, but in my config its an int
    superIntensePartyMode = mkOption {
      type = types.int;
      default = 0;
      description = ''
        Party intensity
        0 - Normal
        1 - Better
        2 - Project X
      '';
    };
  };
  PauseInvitesForever = {
    enabled = mkEnableOption ''
      Brings back the option to pause invites indefinitely that stupit Discord removed.
    '';
  };
  PermissionFreeWill = {
    enabled = mkEnableOption ''
      Disables the client-side restrictions for channel permission management.
    '';
    lockout = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Bypass the permission lockout prevention ("Pretty sure you don't want to do this")
      '';
    };
    onboarding = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Bypass the onboarding requirements ("Making this change will make your server incompatible [...]")
      '';
    };
  };
  PermissionsViewer = {
    enabled = mkEnableOption ''
      View the permissions a user or channel has, and the roles of a server
    '';
    permissionsSortOrder = mkOption {
      type = types.int;
      default = 0;
      description = ''
        The sort method used for defining which role grants an user a certain permission
        0 - Highest Role
        1 - Lowest Role
      '';
    };
    defaultPermissionsDropdownState = mkEnableOption ''
      Whether the permissions dropdown on user popouts should be open by default
    '';
  };
  petpet = {
    enabled = mkEnableOption ''
      Adds a /petpet slash command to create headpet gifs from any image
    '';
  };
  PictureInPicture = {
    enabled = mkEnableOption ''
      Adds picture in picture to videos (next to the Download button)
    '';
    loop = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to make the PiP video loop or not
      '';
    };
  };
  PinDMs = {
    enabled = mkEnableOption ''
      Allows you to pin private channels to the top of your DM list.
      To pin/unpin or reorder pins, right click DMs
    '';
    pinOrder = mkOption {
      type = types.int;
      default = 0;
      description = ''
        Which order should pinned DMs be displayed in?
        0 - Most recent message
        1 - Custom (right click channels to reorder)
      '';
    };
    dmSectioncollapsed = mkEnableOption ''
      Collapse DM sections
    '';
  };
  PlainFolderIcon = {
    enabled = mkEnableOption ''
      Doesn't show the small guild icons in folders
    '';
  };
  PlatformIndicators = {
    enabled = mkEnableOption ''
      Adds platform indicators (Desktop, Mobile, Web...) to users
    '';
    lists = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show indicators in the member list
      '';
    };
    badges = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show indicators in user profiles, as badges
      '';
    };
    messages = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show indicators inside messages
      '';
    };
    colorMobileIndicator = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to make the mobile indicator match the color of the user status.
      '';
    };
  };
  PreviewMessage = {
    enabled = mkEnableOption ''
      Lets you preview your message before sending it.
    '';
  };
  # This is now a discord feature so somewhat redundent
  PronounDB = {
    enabled = mkEnableOption ''
      Adds pronouns to user messages using pronoundb
    '';
    pronounsFormat = mkOption {
      type = types.str;
      default = "LOWERCASE";
      example = "CAPITALIZED";
      description = ''
        The format for pronouns to appear in chat
        LOWERCASE - Lowercase
        CAPITALIZED - Capitalized
      '';
    };
    pronounSource = mkOption {
      # Are you kidding? This plugin just used a string enum!
      type = types.int;
      default = 0;
      description = ''
        Where to source pronouns from
        0 - Prefer PronounDB, fall back to Discord
        1 - Prefer Discord, fall back to PronounDB (might lead to inconsistency between pronouns in chat and profile)
      '';
    };
    showSelf = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Enable or disable showing pronouns for the current user
      '';
    };
    showInMessages = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show in messages
      '';
    };
    showInProfile = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show in profile
      '';
    };
  };
  QuickMention = {
    enabled = mkEnableOption ''
      Adds a quick mention button to the message actions bar
    '';
  };
  QuickReply = {
    enabled = mkEnableOption ''
      Reply to (ctrl + up/down) and edit (ctrl + shift + up/down) messages via keybinds
    '';
    shouldMention = mkOption {
      type = types.int;
      default = 2;
      description = ''
        Ping reply by default
        0 - Disabled
        1 - Enabled
        2 - Follow NoReplyMention
      '';
    };
  };
  ReactErrorDecoder = {
    enabled = mkEnableOption ''
      Replaces "Minifed React Error" with the actual error.
    '';
  };
  ReadAllNotificationsButton = {
    enabled = mkEnableOption ''
      Read all server notifications with a single button click!
    '';
  };
  RelationshipNotifier = {
    enabled = mkEnableOption ''
      Notifies you when a friend, group chat, or server removes you.
    '';
    notices = mkEnableOption ''
      Also show a notice at the top of your screen when removed
      (use this if you don't want to miss any notifications).
    '';
    offlineRemovals = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Notify you when starting discord if you were removed while offline.
      '';
    };
    friends = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Notify when a friend removes you
      '';
    };
    friendRequestCancels = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Notify when a friend request is cancelled
      '';
    };
    servers = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Notify when removed from a server
      '';
    };
    groups = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Notify when removed from a group chat
      '';
    };
  };
  ReplaceGoogleSearch = {
    enabled = mkEnableOption ''
      Replaces the Google search with different Engines
    '';
    customEngineName = mkOption {
      type = types.str;
      default = "";
      # DuckDuckGo is already in the plugin as a default
      example = "DuckDuckGo";
      description = ''
        Name of the custom search engine
      '';
    };
    customEngineURL = mkOption {
      type = types.str;
      default = "";
      example = "https://duckduckgo.com/";
      description = ''
        The URL of your Engine
      '';
    };
  };
  ReplyTimestamp = {
    enabled = mkEnableOption ''
      Shows a timestamp on replied-message previews
    '';
  };
  RevealAllSpoilers = {
    enabled = mkEnableOption ''
      Reveal all spoilers in a message by Ctrl-clicking a spoiler, or in the chat with Ctrl+Shift-click
    '';
  };
  ReverseImageSearch = {
    enabled = mkEnableOption ''
      Adds ImageSearch to image context menus
    '';
  };
  ReviewDB = {
    enabled = mkEnableOption ''
      Review other users (Adds a new settings to profiles)
    '';
    notifyReviews = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Notify about new reviews on startup
      '';
    };
    showWarning = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Display warning to be respectful at the top of the reviews list
      '';
    };
    hideTimestamps = mkEnableOption ''
      Hide timestamps on reviews
    '';
    hideBlockedUsers = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Hide reviews from blocked users
      '';
    };
  };
  RoleColorEverywhere = {
    enabled = mkEnableOption ''
      Adds the top role color anywhere possible
    '';
    chatMentions = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show role colors in chat mentions (including in the message box)
      '';
    };
    memberList = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show role colors in member list role headers
      '';
    };
    voiceUsers = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show role colors in the voice chat user list
      '';
    };
    reactorsList = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show role colors in the reactors list
      '';
    };
  };
  SearchReply = {
    enabled = mkEnableOption ''
      Adds a reply button to search results
    '';
  };
  SecretRingToneEnabler = {
    enabled = mkEnableOption ''
      Always play the secret version of the discord ringtone
      (except during special ringtone events)
    '';
  };
  Summaries = {
    enabled = mkEnableOption ''
      Enables Discord's experimental Summaries feature on every server, displaying AI generated summaries of conversations
    '';
    summaryExpiryThresholdDays = mkOption {
      type = types.float;
      default = 3.0;
      description = ''
        The time in days before a summary is removed. Note that only up to 50 summaries are kept per channel
      '';
    };
  };
  SendTimestamps = {
    enabled = mkEnableOption ''
      Send timestamps easily via chat box button & text shortcuts. Read the extended description!
    '';
    replaceMessageContents = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Replace timestamps in message contents
      '';
    };
  };
  ServerInfo = {
    enabled = mkEnableOption ''
      Allows you to view info about a server
    '';
  };
  ServerListIndicators = {
    enabled = mkEnableOption ''
      Add online friend count or server count in the server list
    '';
    mode = mkOption {
      type = types.int;
      default = 2;
      description = ''
        mode
        1 - Only server count
        2 - Only online friend count
        3 - Both server and onine friend counts
      '';
    };
  };
  ShikiCodeblocks = {
    enabled = mkEnableOption ''
      Brings vscode-style codeblocks into Discord, powered by Shiki
    '';
    theme = mkOption {
      type = types.str;
      default = ''
        https://raw.githubusercontent.com/shikijs/shiki/0b28ad8ccfbf2615f2d9d38ea8255416b8ac3043/packages/shiki/themes/dark-plus.json
      '';
      description = ''
        Github URL for the theme from shiki repo
      '';
    };
    tryHljs = mkOption {
      type = types.str;
      default = "SECONDARY";
      example = "PRIMARY";
      description = ''
        Use the more lightweight default Discord highlighter and theme.
        NEVER - Never
        SECONDARY - Prefer Shiki instead of Highlight.js
        PRIMARY - Prefer Highlight.js intead of Shiki
        ALWAYS - Always
      '';
    };
    useDevIcon = mkOption {
      type = types.str;
      default = "GREYSCALE";
      example = "COLOR";
      description = ''
        How to show language icons on codeblocks
        DISABLED - Disabled
        GREYSCALE - Colorless
        COLOR - Colored
      '';
    };
    bgOpacity = mkOption {
      type = types.float;
      default = 100.0;
      description = ''
        Background opacity
      '';
    };
  };
  ShowAllMessageButtons = {
    enabled = mkEnableOption ''
      Always show all message buttons no matter if you are holding the shift key or not.
    '';
  };
  ShowAllRoles = {
    enabled = mkEnableOption ''
      Show all roles in new profiles.
    '';
  };
  ShowConnections = {
    enabled = mkEnableOption ''
      Show connected accounts in user popouts
    '';
    iconSize = mkOption {
      type = types.int;
      default = 32;
      description = ''
        Icon size (px)
      '';
    };
    iconSpacing = mkOption {
      type = types.int;
      default = 1;
      description = ''
        Icon margin
        0 - Compact
        1 - Cozy
        2 - Roomy
      '';
    };
  };
  ShowHiddenChannels = {
    enabled = mkEnableOption ''
      Show channels that you do not have access to view.
    '';
    hideUnreads = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Hide Unreads
      '';
    };
    showMode = mkOption {
      type = types.int;
      default = 0;
      description = ''
        The mode used to display hidden channels.
        0 - Plain style with Lock Icon instead
        1 - Muted style with hidden eye icon on the right
      '';
    };
    showHiddenChannels = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether the allowed users and roles dropdown on hidden channels should be open by default
      '';
    };
  };
  ShowHiddenThings = {
    enabled = mkEnableOption ''
      Displays various hidden & moderator-only things regardless of permissions.
    '';
    showTimeouts = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show member timeout icons in chat.
      '';
    };
    showInvitesPaused = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show the invites paused tooltip in the server list.
      '';
    };
    showModView = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show the member mod view context menu item in all servers.
      '';
    };
    disableDiscoveryFilters = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Disable filters in Server Discovery search that hide servers that don't meet discovery criteria.
      '';
    };
    disableDisallowedDiscoveryFilters = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Disable filters in Server Discovery search that hide NSFW & disallowed servers.
      '';
    };
  };
  ShowMeYourName = {
    enabled = mkEnableOption ''
      Display usernames next to nicks, or no nicks at all
    '';
    mode = mkOption {
      type = types.str;
      default = "user-nick";
      example = "nick-user";
      description = ''
        How to display usernames and nicks
        user-nick - Username then nickname
        nick-user - Nickname then username 
        user - Username only
      '';
    };
  };
  ShowTimeoutDuration = {
    enabled = mkEnableOption ''
      Shows how much longer a user's timeout will last, either in the timeout icon tooltip or next to it
    '';
    displayStyle = mkOption {
      type = types.str;
      default = "ssalggnikool";
      example = "tooltip";
      description = ''
        How to display the timout duration
        ssalggnikool - Next to the timeout icon
        tooltip - In the Tooltip
      '';
    };
  };
  SilentMessageToggle = {
    enabled = mkEnableOption ''
      Adds a button to the chat bar to toggle sending a silent message.
    '';
    persistentState = mkEnableOption ''
      Whether to persist the state of the silent message toggle when changing channels
    '';
    autoDiable = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Automatically disable the silent message toggle again after sending one
      '';
    };
  };
  SilentTyping = {
    enabled = mkEnableOption ''
      Hide that you are typing
    '';
    showIcon = mkEnableOption ''
      Show an icon for toggling the plugin
    '';
    contextMenu = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Add option to toggle the functionality in the chat input context menu
      '';
    };
    isEnabled = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Toggle functionality
      '';
    };
  };
  SortFriendRequests = {
    enabled = mkEnableOption ''
      Sorts friend requests by date of receipt
    '';
    showDates = mkEnableOption ''
      Show dates on friend requests
    '';
  };
  SpotifyControls = {
    enabled = mkEnableOption ''
      Adds a Spotify player above the account panel
    '';
    hoverControls = mkEnableOption ''
      Show controls on hover
    '';
    useSpotifyUris = mkEnableOption ''
      Open Spotify URIs instead of Spotify URLs. Will only work if you have Spotify installed and might not work on all platforms
    '';
  };
  SpotifyCrack = {
    enabled = mkEnableOption ''
      Free listen along, no auto-pausing in voice chat, and allows activity to continue playing when idling
    '';
    noSpotifyAutoPause = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Disable Spotify auto-pause
      '';
    };
    keepSpotifyActivityOnIdle = mkEnableOption ''
      Keep Spotify activity playing when idling
    '';
  };
  SpotifyShareCommands = {
    enabled = mkEnableOption ''
      Share your current Spotify track, album or artist via slash command (/track, /album, /artist)
    '';
  };
  StartupTimings = {
    enabled = mkEnableOption ''
      Adds Startup Timings to the Settings menu
    '';
  };
  StreamerModeOnStream = {
    enabled = mkEnableOption ''
      Automatically enables streamer mode when you start streaming in Discord
    '';
  };
  SuperReactionTweaks = {
    enabled = mkEnableOption ''
      Customize the limit of Super Reactions playing at once, and super react by default
    '';
    superReactByDefault = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Reaction picker will default to Super Reactions
      '';
    };
    unlimitedSuperReactionPlaying = mkEnableOption ''
      Remove the limit on Super Reactions playing at once
    '';
    superReactionPlayingLimit = mkOption {
      type = types.int;
      default = 20;
      description = ''
        Max Super Reactions to play at once
      '';
    };
  };
  TextReplace = {
    enabled = mkEnableOption ''
      Replace text in your messages. You can find pre-made rules in the
      #textreplace-rules channel in Vencord's Server
    '';
    # The rules are not configured in settings.json
  };
  ThemeAttributes = {
    enabled = mkEnableOption ''
      Adds data attributes to various elements for theming purposes
    '';
  };
  TimeBarAllActivities = {
    enabled = mkEnableOption ''
      Adds the Spotify time bar to all activities if they have start and end timestamps
    '';
  };
  Translate = {
    enabled = mkEnableOption ''
      Translate messages with Google Translate
    '';
    autoTranslate = mkEnableOption ''
      Automatically translate your messages before sending.
      You can also shift/right click the translate button to toggle this
    '';
    showChatBarButton = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show translate button in chat bar
      '';
    };
  };
  TypingIndicator = {
    enabled = mkEnableOption ''
      Adds an indicator if someone is typing on a channel.
    '';
    includeCurrentChannel = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to show the typing indicator for the currently selected channel
      '';
    };
    includeMutedChannels = mkEnableOption ''
      Whether to show the typing indicator for muted channels.
    '';
    includeBlockedUsers = mkEnableOption ''
      Whether to show the typing indicator for blocked users.
    '';
    indicatorMode = mkOption {
      type = types.int;
      default = 3;
      description = ''
        How should the indicator be displayed?
        1 - Animated dots
        2 - Avatars
        3 - Avatars and animated dots
      '';
    };
  };
  TypingTweaks = {
    enabled = mkEnableOption ''
      Show avatars and role colours in the typing indicator
    '';
    showAvatars = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show avatars in the typing indicator
      '';
    };
    showRoleColors = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show role colors in the typing indicator
      '';
    };
    alternativeFormatting = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show a more useful message when several users are typing
      '';
    };
  };
  Unindent = {
    enabled = mkEnableOption ''
      Trims leading indentation from codeblocks
    '';
  };
  UnlockedAvatarZoom = {
    enabled = mkEnableOption ''
      Allows you to zoom in further in the image crop tool when changing your avatar
    '';
    zoomMultiplier = mkOption {
      type = types.int;
      default = 4;
      description = ''
        Zoom multiplier
      '';
    };
  };
  UnsuppressEmbeds = {
    enabled = mkEnableOption ''
      Allows you to unsuppress embeds in messages
    '';
  };
  UserVoiceShow = {
    enabled = mkEnableOption ''
      Shows whether a User is currently in a voice channel somewhere in their profile
    '';
    showInUserProfileModal = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Show a user's voice channel in their profile modal
      '';
    };
    showVoiceChannelSectionHeader = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Whether to show "IN A VOICE CHANNEL" above the join button
      '';
    };
  };
  USRBG = {
    enabled = mkEnableOption ''
      Displays user banners from USRBG, allowing anyone to get a banner without Nitro
    '';
    nitroFirst = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Use Nitro instead of USRBG banner if both are present
      '';
    };
    voiceBackground = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Use USRBG banners as voice chat backgrounds
      '';
    };
  };
  ValidReply = {
    enabled = mkEnableOption ''
      Fixes "Message could not be loaded" upon hovering over the reply
    '';
  };
  ValidUser = {
    enabled = mkEnableOption ''
      Fix mentions for unknown users showing up as '@unknown-user' (hover over a mention to fix it)
    '';
  };
  VoiceChatDoubleClick = {
    enabled = mkEnableOption ''
      Join voice chats via double click instead of single click
    '';
  };
  VcNarrator = {
    enabled = mkEnableOption ''
      Announces when users join, leave, or move voice channels via narrator
    '';
    voice = mkOption {
      type = types.str;
      default = "English (America) espeak-ng";
      description = ''
        Narrator Voice
        There are way too many of these to list
        Voices are from mozilla SpeechSynthesisVoice
      '';
    };
    volume = mkOption {
      type = types.number;
      default = 1;
      example = 0.25;
      description = ''
        Narrator Volume
      '';
    };
    rate = mkOption {
      type = types.number;
      default = 1;
      example = 2;
      description = ''
        Narrator Speed
      '';
    };
    sayOwnName = mkEnableOption ''
      Say own name
    '';
    latinOnly = mkEnableOption ''
      Strip non latin characters from names before saying them
    '';
    joinMessage = mkOption {
      type = types.str;
      default = "{{USER}} joined";
      description = ''
        Join Message
      '';
    };
    leaveMessage = mkOption {
      type = types.str;
      default = "{{USER}} left";
      description = ''
        Leave Message
      '';
    };
    moveMessage = mkOption {
      type = types.str;
      default = "{{USER}} moved to {{CHANNEL}}";
      description = ''
        Move Message
      '';
    };
    muteMessage = mkOption {
      type = types.str;
      default = "{{USER}} Muted";
      description = ''
        Mute Message (only self for now)
      '';
    };
    unmuteMessage = mkOption {
      type = types.str;
      default = "{{USER}} unmuted";
      description = ''
        Unmute Message (only self for now)
      '';
    };
    deafenMessage = mkOption {
      type = types.str;
      default = "{{USER}} deafened";
      description = ''
        Deafen Message (only self for now)
      '';
    };
    undeafenMessage = mkOption {
      type = types.str;
      default = "{{USER}} undeafened";
      description = ''
        Undeafen Message (only self for now)
      '';
    };
  };
  VencordToolbox = {
    enabled = mkEnableOption ''
      Adds a button next to the inbox button in the channel header that houses Vencord quick actions
    '';
  };
  ViewIcons = {
    enabled = mkEnableOption ''
      Makes avatars and banners in user profiles clickable,
      adds View Icon/Banner entries in the user, server and group channel context menu.
    '';
    format = mkOption {
      type = types.str;
      default = "webp";
      description = ''
        Choose the image format to use for non animated images. Animated images will always use .gif
        webp
        png
        jpg
      '';
    };
    imgSize = mkOption {
      type = types.int;
      default = 1024;
      description = ''
        The image size to use
      '';
    };
  };
  ViewRaw = {
    enabled = mkEnableOption ''
      Copy and view the raw content/data of any message, channel or guild
    '';
    clickMethod = mkOption {
      type = types.str;
      default = "Left";
      example = "Right";
      description = ''
        Change the button to view the raw content/data of any message.
      '';
    };
  };
  VoiceDownload = {
    enabled = mkEnableOption ''
      Adds a download to voice messages. (Opens a new browser tab)
    '';
  };
  VoiceMessages = {
    enabled = mkEnableOption ''
      Allows you to send voice messages like on mobile.
      To do so, right click the upload button and click Send Voice Message
    '';
    noiseSuppression = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Noise Suppression
      '';
    };
    echoCancellation = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Echo Cancellation
      '';
    };
  };
  VolumeBooster = {
    enabled = mkEnableOption ''
      Allows you to set the user and stream volume above the default maximum.
    '';
    multiplier = mkOption {
      type = types.int;
      default = 2;
      description = ''
        Volume Multiplier
      '';
    };
  };
  WatchTogetherAdblock = {
    enabled = mkEnableOption ''
      Block ads in the YouTube WatchTogether activity via AdGuard
    '';
  };
  WhoReacted = {
    enabled = mkEnableOption ''
      Renders the avatars of users who reacted to a message
    '';
  };
  XSOverlay = {
    enabled = mkEnableOption ''
      Forwards discord notifications to XSOverlay, for easy viewing in VR
    '';
    botNotifications = mkEnableOption ''
      Allow bot notifications
    '';
    serverNotifications = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Allow server notifications
      '';
    };
    dmnotifications = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Allow Direct Message notifications
      '';
    };
    groupDmNotifications = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Allow Group DM notifications
      '';
    };
    callNotifications = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Allow call notifications
      '';
    };
    pingColor = mkOption {
      type = types.str;
      default = "#7289da";
      description = ''
        User mention color
      '';
    };
    channelPingColor = mkOption {
      type = types.str;
      default = "#8a2be2";
      description = ''
        Channel mention color
      '';
    };
    soundPath = mkOption {
      type = types.str;
      default = "default";
      description = ''
        Notification sound (default/warning/error)
      '';
    };
    timeout = mkOption {
      type = types.int;
      default = 3;
      description = ''
        Notification duration (secs)
      '';
    };
    lengthBasedTimeout = mkOption {
      type = types.bool;
      default = true;
      description = ''
        Extend duration with message length
      '';
    };
    opacity = mkOption {
      type = types.float;
      default = 1.0;
      description = ''
        Notif opacity
      '';
    };
    volume = mkOption {
      type = types.float;
      default = 0.2;
      description = ''
        Volume
      '';
    };
  };
  NoTrack = {
    enabled = mkEnableOption ''
      Disable Discord's tracking (analytics/'science'), metrics and Sentry crash reporting
    '' // { default = true; }; # Required
    disableAnalytics = mkEnableOption ''
      Disable Discord's tracking (analytics/'science')
    '' // { default = true; };
  };
  Settings = {
    enabled = mkEnableOption ''
      Adds Settings UI and debug info
    '' // { default = true; }; # Required
    settingsLocation = mkOption {
      type = types.str;
      default = "aboveNitro";
      example = "top";
      description = ''
        Where to put the Vencord settings section
        top - At the very top
        aboveNitro - Above the Nitro section
        belowNitro - Below the Nitro section
        aboveActivity - Above Activity Settings
        belowActivity - Below Activity Settings
        bottom - At the very bottom
      '';
    };
  };
}
