# Plugin Configs
List of ever configuration option for Vencord plugins

## Enabled by default:
```nix
programs.nixcord.config.plugins.chatInputButtonAPI.enable
programs.nixcord.config.plugins.commandsAPI.enable
programs.nixcord.config.plugins.memberListDecoratorsAPI.enable
programs.nixcord.config.plugins.messageAccessoriesAPI.enable
programs.nixcord.config.plugins.messageDecorationsAPI.enable
programs.nixcord.config.plugins.messageEventsAPI.enable
programs.nixcord.config.plugins.messagePopoverAPI.enable
programs.nixcord.config.plugins.messageUpdaterAPI.enable
programs.nixcord.config.plugins.serverListAPI.enable
programs.nixcord.config.plugins.userSettingsAPI.enable
```
> [!WARNING]
> Only disable the API plugins if you know what you are doing!
> These plugins are dependancies for other plugins to work but
> are not hard required for Vencord to run.

## alwaysAnimate
```nix
programs.nixcord.config.plugins.alwaysAnimate.enable
    # Animates anything that can be animated
```
## alwaysTrust
```nix
programs.nixcord.config.plugins.alwaysTrust.enable
    # Removes the annoying untrusted domain and suspicious file popup
programs.nixcord.config.plugins.alwaysTrust.domain
    # Remove the untrusted domain popup when opening links
    # default: true
programs.nixcord.config.plugins.alwaysTrust.file
    # Remove the 'Potentially Dangerous Download' popup when opening links
```
## anonymiseFileNames
```nix
programs.nixcord.config.plugins.anonymiseFileNames.enable
    # Anonymise uploaded file names
programs.nixcord.config.plugins.anonymiseFileNames.anonymiseByDefault
    # anonymise filenames by default
programs.nixcord.config.plugins.anonymiseFileNames.method
    # method to anonymise filenames
    # type: str
    # default: "randomCharacters"
    # other options are "consistent" and "timestamp"
programs.nixcord.config.plugins.anonymiseFileNames.randomisedLength
    # how long to make randomized filenames
    # type: int
    # default: 7
    # only relevant with method = "randomCharacters"
programs.nixcord.config.plugins.anonymiseFileNames.consistent
    # consistent filename under "consistent" method
    # type: str
    # default: "image"
```
## automodContext
```nix
programs.nixcord.config.plugins.automodContext.enable
    # Allows you to jump to the message surrounding an automod hit
```
## BANger
```nix
programs.nixcord.config.plugins.BANger.enable
    # Replaces the GIF in the ban dialogue with a custom one.
programs.nixcord.config.plugins.BANger.source
    # Source to replace ban GIF with (Video or Gif)
    # type: str
    # default: "https://i.imgur.com/wp5q52C.mp4"
```
## betterFolders
```nix
programs.nixcord.config.plugins.betterFolders.enable
    # Shows server folders on dedicated sidebar and adds folder related imporovements
programs.nixcord.config.plugins.betterFolders.sidebar
    # Display servers from folder on dedicated sidebar
    # default: true
programs.nixcord.config.plugins.betterFolders.sidebarAnim
    # Animate opening the folder sidebar
    # default: true
programs.nixcord.config.plugins.betterFolders.closeAllFolders
    # Close all folders when selecting a server not in a folder
programs.nixcord.config.plugins.betterFolders.closeAllHomeButton
    # Clase all folders when clicking on the home button
programs.nixcord.config.plugins.betterFolders.closeOthers
    # Close other folders when opening a folder
programs.nixcord.config.plugins.betterFolders.forceOpen
    # Force a folder to open when switching to a server of that folder
programs.nixcord.config.plugins.betterFolders.keepIcons
    # Keep showing guild icons in the primary guild bar folderr when it's open in the BetterFolders sidebar
programs.nixcord.config.plugins.betterFolders.showFolderIcon
    # Show the folder icon above the folder guilds in the BetterFolders sidebar
    # type: str
    # default: "never"
    # other options are "always" and "moreThanOne"
    # "moreThanOne" when more than one folder is expanded
```
## betterGifAltText
```nix
programs.nixcord.config.plugins.betterGifAltText.enable
    # Change GIF alt text from simply being 'GIF' to containing the gif tags / filename
```
## betterGifPicker
```nix
programs.nixcord.config.plugins.betterGifPicker.enable
    # Makes the gif picker open the favourite category by default
```
## betterNotesBox
```nix
programs.nixcord.config.plugins.betterNotesBox.enable
    # Hide notes or disable spellcheck (Configure in settings!!)
programs.nixcord.config.plugins.betterNotesBox.hide
    # Hide notes
programs.nixcord.config.plugins.betterNotesBox.noSpellCheck
    # disable spellcheck in notes
```
> [!WARNING]
> betterNotesBox is the only plugin which gives me consistent crashes.
> the json file created by nixcord is identical to one from Vencord,
> so not sure of the cause. (its probably not identical)
## betterRoleContext
```nix
programs.nixcord.config.plugins.betterRoleContext.enable
    # Adds options to copy role color / edit role / view role icon when right clicking roles in the user profile
programs.nixcord.config.plugins.betterRoleContext.roleIconFileFormat
    # File format to use when viewing role icons
    # type: str
    # default: "png"
    # valid formats are "png", "webp", and "jpg"
```
## betterRoleDot
```nix
programs.nixcord.config.plugins.betterRoleDot.enable
    # Copy role color on the RoleDot (accessibility setting) click. Also allows using both RoleDot and colored names simultaneously
programs.nixcord.config.plugins.betterRoleDot.bothStyles
    # Show both role dot and colored names
programs.nixcord.config.plugins.betterRoleDot.copyRoleColorInProfilePopout
    # Allow click on role dot in profile popout to copy role color
```
## betterSessions
```nix
programs.nixcord.config.plugins.betterSessions.enable
    # Enhances the sessions (devices) menu
programs.nixcord.config.plugins.betterSessions.backgroundCheck
    # Check for new sessions in the background, and display notifications when they are detected
programs.nixcord.config.plugins.betterSessions.checkInterval
    # How often to check for new sessions in the background (if enabled), in minutes
    # type: int
    # default = 20
```
## betterSettings
```nix
programs.nixcord.config.plugins.betterSettings.enable
    # Enhances your settings-menu-opening experience
programs.nixcord.config.plugins.betterSettings.disableFade
    # Disable the crossfade animation
    # default: true
programs.nixcord.config.plugins.betterSettings.organizeMenu
    # Organizes the settings cog context menu into categories
    # default: true
programs.nixcord.config.plugins.betterSettings.eagerLoad
    # Removes the loading delay when opening the menu for the first time
    # default: true
```
## betterUploadButton
```nix
programs.nixcord.config.plugins.betterUploadButton.enable
    # Upload with a singl click, open menu with right click
```
## biggerStreamPreview
```nix
programs.nixcord.config.plugins.biggerStreamPreview.enable
    # This plugin allows you to enlarge stream previews
```
## blurNSFW
```nix
programs.nixcord.config.plugins.blurNSFW.enable
    # Blur attachments in NSFW channels until hovered
programs.nixcord.config.plugins.blurNSFW.blurAmount
    # Amount of blur
    # type: int
    # default: 10
```
## callTimer
```nix
programs.nixcord.config.plugins.callTimer.enable
    # Adds a timer to vcs
programs.nixcord.config.plugins.callTimer.format
    # The timer format. This can be any valid moment.js format
    # type: str
    # default: "stopwatch"
    # "human" is common other option
```
## clearURLs
```nix
programs.nixcord.config.plugins.clearURLs.enable
    # Removes tracking garbage from URLs
```
## clientTheme
```nix
programs.nixcord.config.plugins.clientTheme.enable
    # Recreation of the old client theme experiment. Add a color to your Discord client theme
programs.nixcord.config.plugins.clientTheme.color
    # Color your Discord client theme will be based around. Light mode isn't supported
    # RGB hex color as a plain number string
    # type: str
    # default: "313338"
```
## colorSighted
```nix
programs.nixcord.config.plugins.colorSighted.enable
    # Removes the colorblind-friendly icons from statuses, just like 2015-2017 Discord
```
## consoleJanitor
```nix
programs.nixcord.config.plugins.consoleJanitor.enable
    # Disables annoying console messages/errors
programs.nixcord.config.plugins.consoleJanitor.disableNoisyLoggers
    # Disable noisy loggers like the MessageActionCreators
programs.nixcord.config.plugins.consoleJanitor.disableSpotifyLogger
    # Disable the Spotify logger, which leaks account information and access token
    # default: true
```
## consoleShortcuts
```nix
programs.nixcord.config.plugins.consoleShortcuts.enable
    # Adds shorter Aliases for many things on the window. Run `shortcutList` for a list.
```
## copyEmojiMarkdown
```nix
programs.nixcord.config.plugins.copyEmojiMarkdown.enable
    # Allows you to copy emojis as formatted string (<:blobcatcozy:1026533070955872337>)
programs.nixcord.config.plugins.copyEmojiMarkdown.copyUnicode
    # Copy the raw unicode character instead of :name: for default emojis (👽)
    # default: true
```
## copyUserURLs
```nix
programs.nixcord.config.plugins.copyUserURLs.enable
    # Adds a 'Copy User URL' option to the user context menu.
```
## crashHandler
```nix
programs.nixcord.config.plugins.crashHandler.enable
    # Utility plugin for handling and possibly recovering from crashes without a restart
    # default: true     ### this is default enabled in Vencord
programs.nixcord.config.plugins.crashHandler.attemptToPreventCrashes
    # Whether to attempt to prevent Discord crashes.
    # default: true
programs.nixcord.config.plugins.crashHandler.attemptToNavigateToHome
    # Whether to attempt to navigate to the home when preventing Discord crashes
```
## ctrlEnterSend
```nix
programs.nixcord.config.plugins.ctrlEnterSend.enable
    # Use Ctrl+Enter to send messages (customizable)
programs.nixcord.config.plugins.ctrlEnterSend.submitRule
    # The way to send a message
    # type: str
    # default: "ctrl+enter"
    # example: "shift+enter"
    # this is an enum, it only excepts "ctrl+enter", "shift+enter", or "enter"
programs.nixcord.config.plugins.ctrlEnterSend.sendMessageInTheMiddleOfACodeBlock
    # Whether to send a message in the middle of a code block
    # default: true
```
## customRPC
```nix
programs.nixcord.config.plugins.customRPC.enable
    # Allows you to set a custom rich presence
programs.nixcord.config.plugins.customRPC.appID
    # Application ID (required)
    # type: null or str
    # default: null
    # example: "1316659"
programs.nixcord.config.plugins.customRPC.appName
    # Application name (required)
    # type: null or str
    # default: null
    # example: "myRPC"
    # name must be not longer than 128 characters.
programs.nixcord.config.plugins.customRPC.details
    # Details (line 1)
    # type: null or str
    # default: null
    # example: "my RPC desc"
    # must be not longer than 128 characters.
programs.nixcord.config.plugins.customRPC.state
    # State (line 2)
    # type: null or str
    # default: null
    # example: "my RPC state"
    # must be not longer than 128 characters.
programs.nixcord.config.plugins.customRPC.type
    # Activity type
    # type: str
    # default: "playing"
    # can be one of:
    #   "playing"
    #   "streaming"
    #   "listening"
    #   "watching"
    #   "competing"
programs.nixcord.config.plugins.customRPC.streamLink
    # Twitch.tv or Youtube.com link (only for Streaming activity type)
    # type: null or str
    # default: null
programs.nixcord.config.plugins.customRPC.timestampMode
    # Timestamp mode
    # type: str
    # default: "none"
    # can be one of:
    #   "none"
    #   "discordUptime"
    #   "currentTime"
    #   "customTime"
programs.nixcord.config.plugins.customRPC.startTime
    # Start timestamp in milliseconds (only for custom timestamp mode)
    # type: null or int
    # default: null
    # must be greater than 0
programs.nixcord.config.plugins.customRPC.endTime
    # End timestamp in milliseconds (only for custom timestamp mode)
    # type: null or int
    # default: null
    # must be greater than 0
programs.nixcord.config.plugins.customRPC.imageBig
    # Big image key/link
    # type: str
    # default: ""
programs.nixcord.config.plugins.customRPC.imageBigTooltip
    # Big image tooltip
    # type: str
    # default: ""
    # must be not longer than 128 characters
programs.nixcord.config.plugins.customRPC.imageSmall
    # Small image key/link
    # type: str
    # default: ""
programs.nixcord.config.plugins.customRPC.imageSmallTooltip
    # Small image tooltip
    # type: str
    # default: ""
    # must be not longer than 128 characters
programs.nixcord.config.plugins.customRPC.buttonOneText
    # Button 1 text
    # type: str
    # default: ""
    # must be not longer than 31 characters
programs.nixcord.config.plugins.customRPC.buttonOneURL
    # Button 1 URL
    # type: str
    # default: ""
programs.nixcord.config.plugins.customRPC.buttonTwoText
    # Button 2 text
    # type: str
    # default: ""
    # must be not longer than 31 characters
programs.nixcord.config.plugins.customRPC.buttonTwoURL
    # Button 2 URL
    # type: str
    # default: ""
```
## customIdle
```nix
programs.nixcord.config.plugins.customIdle.enable
    # Allows you to set teh time before Discord goes idle (or diable auto-idle)
programs.nixcord.config.plugins.customIdle.idleTimeout
    # Minutes before Discord goes idle (0 to disable auto-idle)
    # type: float
    # default: 10.0
programs.nixcord.config.plugins.customIdle.remainInIdle
    # When you come back to Discord, remain idle until you confirm you want to go online
    # default: true
```
## dearrow
```nix
programs.nixcord.config.plugins.dearrow.enable
    # Makes YouTube embed titles and thumbnails less sensationalist, powered by Dearrow
programs.nixcord.config.plugins.dearrow.hideButton
    # Hides the Dearrow button from YouTube embeds
programs.nixcord.config.plugins.dearrow.replaceElements
    # Which elements of the embed will be replaced
    # type: str
    # default: "everything"
    # other options are "titles" and "thumbnails"
```
## decor
```nix
programs.nixcord.config.plugins.decor.enable
    # Create and use your own custom avatar decorations, or pick your favorite from the presets.
```
## disableCallIdle
```nix
programs.nixcord.config.plugins.disableCallIdle.enable
    # Disables automatically getting kicked from a DM voice call after 3 minutes and being moved to an AFK voice channel.
```
## dontRoundMyTimestamps
```nix
programs.nixcord.config.plugins.dontRoundMyTimestamps.enable
    # Always rounds relative timestamps down, so 7.6y becomes 7y instead of 8y
```
## emoteCloner
```nix
programs.nixcord.config.plugins.emoteCloner.enable
    # Allows you to clone Emotes & Stickers to your own server (right click them)
```
## experiments
```nix
programs.nixcord.config.plugins.experiments.enable
    # Enable Access to Experiments & other dev-only features in Discord!
programs.nixcord.config.plugins.experiments.toolbarDevMenu
    # Change the Help (?) toolbar button (top right in chat) to Discord's developer menu
```
## f8Break
```nix
programs.nixcord.config.plugins.f8Break.enable
    # Pause the client when you press F8 with DevTools (+ breakpoints) open.
```
## fakeNitro
```nix
programs.nixcord.config.plugins.fakeNitro.enable
    # Allows you to stream in nitro quality, send fake emojis/stickers,
    # use client themes and custom Discord notifications.
programs.nixcord.config.plugins.fakeNitro.enableEmojiBypass
    # Allows sending fake emojis (also bypasses missing permission to use custom emojis)
    # default: true
programs.nixcord.config.plugins.fakeNitro.emojiSize
    # Size of the emojis when sending
    # type: int
    # default: 48
    # example: 128
programs.nixcord.config.plugins.fakeNitro.transformEmojis
    # Whether to transform fake emojis into real ones
    # default: true
programs.nixcord.config.plugins.fakeNitro.enableStickerBypass
    # Allows sending fake stickers (also bypasses missing permission to use stickers)
    # default: true
programs.nixcord.config.plugins.fakeNitro.stickerSize
    # Size of the stickers when sending
    # type: int
    # default: 160
    # example: 256
programs.nixcord.config.plugins.fakeNitro.transformStickers
    # Whether to transform fake stickers into real ones
    # default: true
programs.nixcord.config.plugins.fakeNitro.transformCompoundSentence
    # Whether to transform fake stickers and emojis in compound sentences
    # (sentences with more content than just the fake emoji or sticker link)
programs.nixcord.config.plugins.fakeNitro.enableStreamQualityBypass
    # Allow streaming in nitro quality
    # default: true
programs.nixcord.config.plugins.fakeNitro.useHyperLinks
    # Whether to use hyperlinks when sending fake emojis and stickers
    # default: true
programs.nixcord.config.plugins.fakeNitro.hyperLinkText
    # What text the hyperlink should use.
    # {{NAME}} will be replaced with the emoji/sticker name.
    # type: str
    # default: "{{NAME}}"
programs.nixcord.config.plugins.fakeNitro.disableEmbedPermissionCheck
    # Whether to disable the embed permission check when sending fake emojis and stickers
```
## fakeProfileThemes
```nix
programs.nixcord.config.plugins.fakeProfileThemes.enable
    # Allows profile theming by hiding the colors in your bio thanks to invisible 3y3 encoding
programs.nixcord.config.plugins.fakeProfileThemes.nitroFirst
    # Use Nitro color source first if both are present
    # default: true
```
## favoriteEmojiFirst
```nix
programs.nixcord.config.plugins.favoriteEmojiFirst.enable
    # Puts your favorite emoji first in the emoji autocomplete.
```
## favoriteGifSearch
```nix
programs.nixcord.config.plugins.favoriteGifSearch.enable
    # Adds a search bar to favorite gifs. 
programs.nixcord.config.plugins.favoriteGifSearch.searchOption
    # The part of the url you want to search
    # type: str
    # default: "hostandpath"
    # other options are "url" and "path"
```
## fixCodeblockGap
```nix
programs.nixcord.config.plugins.fixCodeblockGap.enable
    # Removes the gap between codeblocks and text below it
```
## fixSpotifyEmbeds
```nix
programs.nixcord.config.plugins.fixSpotifyEmbeds.enable
    # Fixes spotify embeds being incredibly loud by letting you customise the volume
programs.nixcord.config.plugins.fixSpotifyEmbeds.volume
    # The volume % to set for spotify embeds. Anything above 10% is veeeery loud
    # type: float
    # default: 10.0
```
## fixYoutubeEmbeds
```nix
programs.nixcord.config.plugins.fixYoutubeEmbeds.enable
    # Bypasses youtube videos being blocked from display on Discord (for example by UMG)
```
## forceOwnerCrown
```nix
programs.nixcord.config.plugins.forceOwnerCrown.enable
    # Force the owner crown next to usernames even if the server is large.
```
## friendInvites
```nix
programs.nixcord.config.plugins.friendInvites.enable
    # Create and manage friend invite links via slash commands
    # (/create friend invite, /view friend invites, /revoke friend invites).
```
## friendsSince
```nix
programs.nixcord.config.plugins.friendsSince.enable
    # Shows when you became friends with someone in the user popout
```
## gameActivityToggle
```nix
programs.nixcord.config.plugins.gameActivityToggle.enable
    # Adds a button next to the mic and deafen button to toggle game activity.
programs.nixcord.config.plugins.gameActivityToggle.oldIcon
    # Use the old icon style before Discord icon redesign
```
## gitPaste
```nix
programs.nixcord.config.plugins.gitPaste.enable
    # Makes picking a gif in the gif picker insert a link into the chatbox instead of instantly sending it
```
## greetStickerPicker
```nix
programs.nixcord.config.plugins.greetStickerPicker.enable
    # Allows you to use any greet sticker instead of only the
    # random one by right-clicking the 'Wave to say hi!' button
programs.nixcord.config.plugins.greetStickerPicker.greetMode
    # Choose the greet mode
    # type: str
    # default: "Greet"
    # other option is "Message" # allows greet spam
```
## hideAttachments
```nix
programs.nixcord.config.plugins.hideAttachments.enable
    # Hide attachments and Embeds for individual messages via hover button
```
## iLoveSpam
```nix
programs.nixcord.config.plugins.iLoveSpam.enable
    # Do not hide messages from 'likely spammers'
```
## ignoreActivities
```nix
programs.nixcord.config.plugins.ignoreActivities.enable
    # Ignore activities from showing up on your status ONLY.
    # You can configure which ones are specifically ignored from the
    # Registered Games and Activities tabs, or use the general settings below.
programs.nixcord.config.plugins.ignoreActivities.allowedIds
    # Comma separated list of activity IDs to allow (Useful for allowing RPC activities and CustomRPC)
    # type: str
    # default: ""
    # example: "235834946571337729, 343383572805058560";
programs.nixcord.config.plugins.ignoreActivities.ignorePlaying
    # Ignore all playing activities (These are usually game and RPC activities)
programs.nixcord.config.plugins.ignoreActivities.ignoreStreaming
    # Ignore all streaming activities
programs.nixcord.config.plugins.ignoreActivities.ignoreListening
    # Ignore all listening activities (These are usually spotify activities)
programs.nixcord.config.plugins.ignoreActivities.ignoreWatching
    # Ignore all watching activities
programs.nixcord.config.plugins.ignoreActivities.ignoreCompeting
    # Ignore all competing activities (These are normally special game activities)
```
## imageLink
```nix
programs.nixcord.config.plugins.imageLink.enable
    # Never hide image links in messages, even if it's the only content
```
## imageZoom
```nix
programs.nixcord.config.plugins.imageZoom.enable
    # Lets you zoom in to images and gifs.
    # Use scroll wheel to zoom in and shift + scroll wheel to increase lens radius / size
programs.nixcord.config.plugins.imageZoom.saveZoomValues
    # Whether to save zoom and lens size values
## imageZoom
    # default: true
programs.nixcord.config.plugins.imageZoom.enable
    # Invert scroll
    # default: true
programs.nixcord.config.plugins.imageZoom.nearestNeighbour
    # Use Nearest Neighbour Interpolation when scaling images
programs.nixcord.config.plugins.imageZoom.square
    # Make the lens square
programs.nixcord.config.plugins.imageZoom.zoom
    # Zoom of the lens
    # type: float
    # default: 2.0
programs.nixcord.config.plugins.imageZoom.size
    # Radius / Size of the lens
    # type: float
    # default: 100.0
programs.nixcord.config.plugins.imageZoom.zoomSpeed
    # How fast the zoom / lens size changes
    # type: float
    # default: 0.5
```
## implicitRelationships
```nix
programs.nixcord.config.plugins.implicitRelationships.enable
    # Shows your implicit relationships in the Friends tab.
programs.nixcord.config.plugins.implicitRelationships.sortByAffinity
    # Whether to sort implicit relationships by their affinity to you.
```
## invisibleChat
```nix
programs.nixcord.config.plugins.invisibleChat.enable
    # Encrypt your Messages in a non-suspicious way!
programs.nixcord.config.plugins.invisibleChat.savedPasswords
    # Saved Passwords (Seperated with a , )
    # type: str
    # default: "password, Password"
```
## keepCurrentChannel
```nix
programs.nixcord.config.plugins.keepCurrentChannel.enable
    # Attempt to navigate to the channel you were in before switching accounts or loading Discord.
```
## lastFMRichPresence
```nix
programs.nixcord.config.plugins.lastFMRichPresence.enable
    # Little plugin for Last.fm rich presence
programs.nixcord.config.plugins.lastFMRichPresence.username
    # last.fm username
    # type: str
    # default: ""
programs.nixcord.config.plugins.lastFMRichPresence.apiKey
    # last.fm api key
    # type: str
    # default: ""
programs.nixcord.config.plugins.lastFMRichPresence.shareUsername
    # show link to last.fm profile
programs.nixcord.config.plugins.lastFMRichPresence.shareSong
    # show link to song on last.fm
    # default: true
programs.nixcord.config.plugins.lastFMRichPresence.hideWithSpotify
    # hide last.fm presence if spotify is running
    # default: true
programs.nixcord.config.plugins.lastFMRichPresence.statusName
    # custom status text
    # type: str
    # default: "some music"
programs.nixcord.config.plugins.lastFMRichPresence.nameFormat
    # Show name of song and artist in status name
    # type: str
    # default "status-name"
    # one of:
    #   "status-name"
    #   "artist-first"
    #   "song-first"
    #   "artist"
    #   "song"
    #   "album"
programs.nixcord.config.plugins.lastFMRichPresence.useListeningStatus
    # show "Listening to" status instead of "Playing"
programs.nixcord.config.plugins.lastFMRichPresence.missingArt
    # When album or album art is missing
    # type: str
    # default: "lastfmLogo"
    # can also be "placeholder"
programs.nixcord.config.plugins.lastFMRichPresence.showLastFmLogo
    # show the Last.fm logo by the album cover
    # default: true
```
## loadingQuotes
```nix
programs.nixcord.config.plugins.loadingQuotes.enable
    # Replace Discords loading quotes
programs.nixcord.config.plugins.loadingQuotes.replaceEvents
    # Should this plugin also apply during events with special event themed quotes? (e.g. Halloween)
    # default: true
programs.nixcord.config.plugins.loadingQuotes.enablePluginPresetQuotes
    # Enable the quotes preset by this plugin
    # default: true
programs.nixcord.config.plugins.loadingQuotes.enableDiscordPresetQuotes
    # Enable Discord's preset quotes (including event quotes, during events)
programs.nixcord.config.plugins.loadingQuotes.additionalQuotes
    # Additional custom quotes to possibly appear, separated by additionalQuotesDelimiter
    # type: str
    # default: ""
    # example: "This is a quote|This is another"
programs.nixcord.config.plugins.loadingQuotes.additionalQuotesDelimiter
    # Delimiter for additional quotes
    # type: str
    # default: "|"
```
## maskedLinkedPaste
```nix
programs.nixcord.config.plugins.maskedLinkedPaste.enable
    # Pasting a link while having text selected will paste a hyperlink
```
## memberCount
```nix
programs.nixcord.config.plugins.memberCount.enable
    # Shows the amount of online & total members in the server member list and tooltip
programs.nixcord.config.plugins.memberCount.toolTip
    # If the member count should be displayed on the server tooltip
    # default: true
programs.nixcord.config.plugins.memberCount.memberList
    # If the member count should be displayed on the member list
    # default: true
```
## mentionAvatars
```nix
programs.nixcord.config.plugins.mentionAvatars.enable
    # Shows user avatars inside mentions
```
## messageClickActions
```nix
programs.nixcord.config.plugins.messageClickActions.enable
    # Hold Backspace and click to delete, double click to edit/reply
programs.nixcord.config.plugins.messageClickActions.enableDeleteOnClick 
    # Enable delete on click while holding backspace
    # default: true
programs.nixcord.config.plugins.messageClickActions.enableDoubleClickToEdit
    # Enable double click to edit
    # default: true
programs.nixcord.config.plugins.messageClickActions.enableDoubleClickToReply
    # Enable double click to reply
    # default: true
programs.nixcord.config.plugins.messageClickActions.requireModifier
    # Only do double click actions when shift/ctrl is held
```
## messageLatency
```nix
programs.nixcord.config.plugins.messageLatency.enable
    # Displays an indicator for messages that took ≥n seconds to send
programs.nixcord.config.plugins.messageLatency.latency
    # Threshold in seconds for latency indicator
    # type: int
    # default: 2
programs.nixcord.config.plugins.messageLatency.detectDiscordKotlin
    # Detect old Discord Android clients
    # default: true
programs.nixcord.config.plugins.messageLatency.showMillis
    # Show milliseconds
```
## messageLinkEmbeds
```nix
programs.nixcord.config.plugins.messageLinkEmbeds.enable
    # Adds a preview to messages that link another message
programs.nixcord.config.plugins.messageLinkEmbeds.messageBackgroundColor
    # Background color for messages in rich embeds
programs.nixcord.config.plugins.messageLinkEmbeds.automodEmbeds
    # Use automod embeds instead of rich embeds (smaller but less info)
    # type: str
    # default: "never"
    # other options are "always" or "prefer"
programs.nixcord.config.plugins.messageLinkEmbeds.listMode
    # Whether to use ID list as blacklist or whitelist
    # type: str
    # default: "blacklist"
    # can also be "whitelist"
programs.nixcord.config.plugins.messageLinkEmbeds.idList
    # Guild/channel/user IDs to blacklist or whitelist (separate with comma)
    # type: str
    # default: ""
    # example: "13, 4, 5"
```
## messageLogger
```nix
programs.nixcord.config.plugins.messageLogger.enable
    # Temporarily logs deleted and edited messages.
programs.nixcord.config.plugins.messageLogger.deleteStyle
    # The style of deleted messages
    # type: str
    # default: "text"
    # can also be "overlay"
programs.nixcord.config.plugins.messageLogger.logDeletes
    # Whether to log deleted messages
    # default: true
programs.nixcord.config.plugins.messageLogger.collapseDeleted
    # Whether to collapse deleted messages, similar to blocked messages
programs.nixcord.config.plugins.messageLogger.logEdits
    # Whether to log edited messages
    # default: true
programs.nixcord.config.plugins.messageLogger.inlineEdits
    # Whether to display edit history as part of message content
    # default: true
programs.nixcord.config.plugins.messageLogger.ignoreBots
    # Whether to ignore messages by bots
programs.nixcord.config.plugins.messageLogger.ignoreSelf
    # Whether to ignore messages by yourself
programs.nixcord.config.plugins.messageLogger.ignoreUsers
    # Comma-separated list of user IDs to ignore
    # type: str
    # default: ""
programs.nixcord.config.plugins.messageLogger.ignoreChannels
    # Comma-separated list of channel IDs to ignore
    # type: str
    # default: ""
programs.nixcord.config.plugins.messageLogger.ignoreGuilds
    # Comma-separated list of guild IDs to ignore
    # type: str
    # default: ""
```
## messageTags
```nix
programs.nixcord.config.plugins.messageTags.enable
    # Allows you to save messages and to use them with a simple command.
programs.nixcord.config.plugins.messageTags.clyde
    # If enabled, clyde will send you an ephemeral message when a tag was used.
    # default: true
```
## moreCommands
```nix
programs.nixcord.config.plugins.moreCommands.enable
    # echo, lenny, mock
```
## moreKaomoji
```nix
programs.nixcord.config.plugins.moreKaomoji.enable
    # Adds more Kaomoji to discord. ヽ(´▽`)/
```
## moreUserTags
```nix
programs.nixcord.config.plugins.moreUserTags.enable
    # Adds tags for webhooks and moderative roles (owner, admin, etc.)
programs.nixcord.config.plugins.moreUserTags.dontShowForBots
    # Don't show extra tags for bots (excluding webhooks)
programs.nixcord.config.plugins.moreUserTags.dontShowBotTag
    # Only show extra tags for bots / Hide [BOT] text
programs.nixcord.config.plugins.moreUserTags.tagSettings.webhook.text
    # Webhook tag
    # type: str
    # default: "Webhook"
programs.nixcord.config.plugins.moreUserTags.tagSettings.webhook.showInChat
    # Show in messages
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.webhook.showInNotChat
    # Show in member list and profiles
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.owner.text
    # Owner tag
    # type: str
    # default: "Owner"
programs.nixcord.config.plugins.moreUserTags.tagSettings.owner.showInChat
    # Show in messages
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.owner.showInNotChat
    # Show in member list and profiles
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.administrator.text
    # Admin tag
    # type: str
    # default: "Admin"
programs.nixcord.config.plugins.moreUserTags.tagSettings.administrator.showInChat
    # Show in messages
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.administrator.showInNotChat
    # Show in member list and profiles
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.moderatorStaff.text
    # Staff tag
    # type: str
    # default: "Staff"
programs.nixcord.config.plugins.moreUserTags.tagSettings.moderatorStaff.showInChat
    # Show in messages
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.moderatorStaff.showInNotChat
    # Show in member list and profiles
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.moderator.text
    # Mod tag
    # type: str
    # default: "Mod"
programs.nixcord.config.plugins.moreUserTags.tagSettings.moderator.showInChat
    # Show in messages
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.moderator.showInNotChat
    # Show in member list and profiles
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.voiceModerator.text
    # VC mod tag
    # type: str
    # default: "VC Mod"
programs.nixcord.config.plugins.moreUserTags.tagSettings.voiceModerator.showInChat
    # Show in messages
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.voiceModerator.showInNotChat
    # Show in member list and profiles
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.chatModerator.text
    # Chat mod tag
    # type: str
    # default: "Chat Mod"
programs.nixcord.config.plugins.moreUserTags.tagSettings.chatModerator.showInChat
    # Show in messages
    # default: true
programs.nixcord.config.plugins.moreUserTags.tagSettings.chatModerator.showInNotChat
    # Show in member list and profiles
    # default: true
```
## moyai
```nix
programs.nixcord.config.plugins.moyai.enable
    # 🗿🗿🗿🗿🗿🗿🗿🗿
programs.nixcord.config.plugins.moyai.volume
    # Volume of the 🗿🗿🗿
    # type: float
    # default: 0.5
programs.nixcord.config.plugins.moyai.quality
    # Quality of the 🗿🗿🗿
    # type: str
    # default: "Normal"
    # can also be "HD"
programs.nixcord.config.plugins.moyai.triggerWhenUnfocused
    # Trigger the 🗿 even when the window is unfocused
    # default: true
programs.nixcord.config.plugins.moyai.ignoreBots
    # Ignore bots
    # default: true
programs.nixcord.config.plugins.moyai.ignoreBlocked
    # Ignore blocked users
    # default: true
```
## mutualGroupDMs
```nix
programs.nixcord.config.plugins.mutualGroupDMs.enable
    # Shows mutual group dms in profiles
```
## newGuildSettings
```nix
programs.nixcord.config.plugins.newGuildSettings.enable
    # Shows mutual group dms in profiles
programs.nixcord.config.plugins.newGuildSettings.guild
    # Automatically mute new servers and change various other settings upon joining
    # default: true
programs.nixcord.config.plugins.newGuildSettings.messages
    # Mute Guild automatically
    # type: str
    # default: "serverDefault"
    # one of:
    #   "serverDefault"
    #   "all"
    #   "only@Mentions"
    #   "nothing"
programs.nixcord.config.plugins.newGuildSettings.everyone
    # Server Notification Settings
    # default: true
programs.nixcord.config.plugins.newGuildSettings.role
    # Suppress All Role @mentions
    # default: true
programs.nixcord.config.plugins.newGuildSettings.highlight
    # Suppress Highlights automatically
    # default: true
programs.nixcord.config.plugins.newGuildSettings.events
    # Mute New Events automatically
    # default: true
programs.nixcord.config.plugins.newGuildSettings.showAllChannels
    # Show all channels automatically
    # default: true
```
## noBlockedMessages
```nix
programs.nixcord.config.plugins.noBlockedMessages.enable
    # Hides all blocked messages from chat completely.
programs.nixcord.config.plugins.noBlockedMessages.ignoreBlockedMessages
    # Completely ignores (recent) incoming messages from blocked users (locally).
```
## noDefaultHangStatus
```nix
programs.nixcord.config.plugins.noDefaultHangStatus.enable
    # Disable the default hang status when joining voice channels
```
## noDevtoolsWarning
```nix
programs.nixcord.config.plugins.noDevtoolsWarning.enable
    # Disables the 'HOLD UP' banner in the console. As a side effect,
    # also prevents Discord from hiding your token, which prevents random logouts.
```
## noF1
```nix
programs.nixcord.config.plugins.noF1.enable
    # Disables F1 help bind.
```
## noMosaic
```nix
programs.nixcord.config.plugins.noMosaic.enable
    # Removes Discord new image mosaic
programs.nixcord.config.plugins.noMosaic.inlineVideo
    # Play videos without carousel modal
    # default: true
```
## noOnboardingDelay
```nix
programs.nixcord.config.plugins.noOnboardingDelay.enable
    # Skips the slow and annoying onboarding delay
```
## noPendingCount
```nix
programs.nixcord.config.plugins.noPendingCount.enable
    # Removes the ping count of incoming friend requests, message requests, and nitro offers.
programs.nixcord.config.plugins.noPendingCount.hideFriendRequestsCount
    # Hide incoming friend requests count
    # default: true
programs.nixcord.config.plugins.noPendingCount.hideMessageRequestsCount
    # Hide message requests count
    # default: true
programs.nixcord.config.plugins.noPendingCount.hidePremiumOffersCount
    # Hide nitro offers count
    # default: true
```
## noProfileThemes
```nix
programs.nixcord.config.plugins.noProfileThemes.enable
    # Completely removes Nitro profile themes
```
## noRPC
```nix
programs.nixcord.config.plugins.noRPC.enable
    # Disables Discord's RPC server.
```
## noReplyMention
```nix
programs.nixcord.config.plugins.noReplyMention.enable
    # Disables reply pings by default
programs.nixcord.config.plugins.noReplyMention.userList
    # List of users to allow or exempt pings for (separated by commas or spaces)
    # type: str
    # default: ""
    # example: "1234567890123445 1234567890123445"
programs.nixcord.config.plugins.noReplyMention.shouldPingListed
    # Whether or not to ping or not ping the users in userList
    # default: true
programs.nixcord.config.plugins.noReplyMention.inverseShiftReply
    # Invert Discord's shift replying behaviour (enable to make shift reply mention user)
```
## noScreensharePreview
```nix
programs.nixcord.config.plugins.noScreensharePreview.enable
    # Disables screenshare previews from being sent.
```
## noServerEmojis
```nix
programs.nixcord.config.plugins.noServerEmojis.enable
    # Do not show server emojis in the autocomplete menu.
programs.nixcord.config.plugins.noServerEmojis.shownEmojis
    # The types of emojis to show in the autocomplete menu.
    # type: str
    # default: "onlyUnicode"
    # one of:
    #   "onlyUnicode"
    #   "currentServer"
    #   "all"
```
## noSystemBadge
```nix
programs.nixcord.config.plugins.noSystemBadge.enable
    # Disables the taskbar and system tray unread count badge.
```
## noTypingAnimation
```nix
programs.nixcord.config.plugins.noTypingAnimation.enable
    # Disables the CPU-intensive typing dots animation
```
## noUnblockToJump
```nix
programs.nixcord.config.plugins.noUnblockToJump.enable
    # Allows you to jump to messages of blocked users without unblocking them
```
## normalizeMessageLinks
```nix
programs.nixcord.config.plugins.normalizeMessageLinks.enable
    # Strip canary/ptb from message links
```
## notificationVolume
```nix
programs.nixcord.config.plugins.notificationVolume.enable
    # Save your ears and set a separate volume for notifications and in-app sounds
programs.nixcord.config.plugins.notificationVolume.notificationVolume
    # Notification volume
    # type: float
    # default: 100.0
```
## nsfwGateBypass
```nix
programs.nixcord.config.plugins.nsfwGateBypass.enable
    # Allows you to access NSFW channels without setting/verifying your age
```
## onePingPerDM
```nix
programs.nixcord.config.plugins.onePingPerDM.enable
    # If unread messages are sent by a user in DMs multiple times, you'll only receive one audio ping.
    # Read the messages to reset the limit
programs.nixcord.config.plugins.onePingPerDM.channelToAffect
    # Select the type of DM for the plugin to affect
    # type: str
    # default: "both_dms"
    # one of:
    #   "both_dms"
    #   "user_dm"
    #   "group_dm"
programs.nixcord.config.plugins.onePingPerDM.allowMentions
    # Receive audio pings for @mentions
programs.nixcord.config.plugins.onePingPerDM.allowEveryone
    # Receive audio pings for @everyone and @here in group DMs
```
## oneko
```nix
programs.nixcord.config.plugins.oneko.enable
    # cat follow mouse (real)
```
## openInApp
```nix
programs.nixcord.config.plugins.openInApp.enable
    # Open Spotify, Tidal, Steam and Epic Games URLs in their respective apps instead of your browser
programs.nixcord.config.plugins.openInApp.spotify
    # Open Spotify links in the Spotify app
programs.nixcord.config.plugins.openInApp.steam
    # Open Steam links in the Steam app
programs.nixcord.config.plugins.openInApp.epic
    # Open Epic Games links in the Epic Games Launcher
programs.nixcord.config.plugins.openInApp.tidal
    # Open Tidal links in the Tidal app
```
## overrideForumDefaults
```nix
programs.nixcord.config.plugins.overrideForumDefaults.enable
    # Allows you to override default forum layout/sort order. you can still change it on a per-channel basis
programs.nixcord.config.plugins.overrideForumDefaults.defaultLayout
    # Which layout to use as default
    # type: str
    # default: "list"
    # can also be "gallery"
programs.nixcord.config.plugins.overrideForumDefaults.defaultSortOrder
    # Which sort order to use as default
    # type: str
    # default: "recentlyActive"
    # can also be "datePosted"
```
## partyMode
```nix
programs.nixcord.config.plugins.partyMode.enable
    # Allows you to use party mode cause the party never ends ✨
programs.nixcord.config.plugins.partyMode.superIntensePartyMode
    # Party intensity
    # type: str
    # default: "normal"
    # other options are "better", and "projectX"
```
## pauseInvitesForever
```nix
programs.nixcord.config.plugins.pauseInvitesForever.enable
    # Brings back the option to pause invites indefinitely that stupit Discord removed.
```
## permissionFreeWill
```nix
programs.nixcord.config.plugins.permissionFreeWill.enable
    # Disables the client-side restrictions for channel permission management.
programs.nixcord.config.plugins.permissionFreeWill.lockout
    # Bypass the permission lockout prevention ("Pretty sure you don't want to do this")
    # default: true
programs.nixcord.config.plugins.permissionFreeWill.onboarding
    # Bypass the onboarding requirements ("Making this change will make your server incompatible [...]")
    # default: true
```
## permissionsViewer
```nix
programs.nixcord.config.plugins.permissionsViewer.enable
    # View the permissions a user or channel has, and the roles of a server
programs.nixcord.config.plugins.permissionsViewer.permissionsSortOrder
    # The sort method used for defining which role grants an user a certain permission
    # type: str
    # default: "highestRole"
    # can also be "lowestRole"
programs.nixcord.config.plugins.permissionsViewer.defaultPermissionsDropdownState
    # Whether the permissions dropdown on user popouts should be open by default
```
## petpet
```nix
programs.nixcord.config.plugins.petpet.enable
    # Adds a /petpet slash command to create headpet gifs from any image
```
## pictureInPicture
```nix
programs.nixcord.config.plugins.pictureInPicture.enable
    # Adds picture in picture to videos (next to the Download button)
programs.nixcord.config.plugins.pictureInPicture.loop
    # Whether to make the PiP video loop or not
    # default: true
```
## pinDMs
```nix
programs.nixcord.config.plugins.pinDMs.enable
    # Allows you to pin private channels to the top of your DM list.
    # To pin/unpin or reorder pins, right click DMs
programs.nixcord.config.plugins.pinDMs.pinOrder
    # Which order should pinned DMs be displayed in?
    # type: str
    # default: "mostRecent"
    # can also be "custom"
programs.nixcord.config.plugins.pinDMs.dmSectioncollapsed
    # Collapse DM sections
```
## plainFolderIcon
```nix
programs.nixcord.config.plugins.plainFolderIcon.enable
    # Doesn't show the small guild icons in folders
```
## platformIndicators
```nix
programs.nixcord.config.plugins.platformIndicators.enable
    # Adds platform indicators (Desktop, Mobile, Web...) to users
programs.nixcord.config.plugins.platformIndicators.lists
    # Show indicators in the member list
    # default: true
programs.nixcord.config.plugins.platformIndicators.badges
    # Show indicators in user profiles, as badges
    # default: true
programs.nixcord.config.plugins.platformIndicators.messages
    # Show indicators inside messages
    # default: true
programs.nixcord.config.plugins.platformIndicators.colorMobileIndicator
    # Whether to make the mobile indicator match the color of the user status.
    # default: true
```
## previewMessage
```nix
programs.nixcord.config.plugins.previewMessage.enable
    # Lets you preview your message before sending it.
```
## pronounDB
```nix
programs.nixcord.config.plugins.pronounDB.enable
    # Adds pronouns to user messages using pronoundb
programs.nixcord.config.plugins.pronounDB.pronounsFormat
    # The format for pronouns to appear in chat
    # type: str
    # default: "LOWERCASE"
    # can be "CAPITALIZED"
programs.nixcord.config.plugins.pronounDB.pronounsSource
    # Where to source pronouns from
    # type: str
    # default: "preferPronounDB"
    # can be "preferDiscord"
programs.nixcord.config.plugins.pronounDB.showSelf
    # Enable or disable showing pronouns for the current user
    # default: true
programs.nixcord.config.plugins.pronounDB.showInMessages
    # Show in messages
    # default: true
programs.nixcord.config.plugins.pronounDB.showInProfile
    # Show in profile
    # default: true
```
## quickMention
```nix
programs.nixcord.config.plugins.quickMention.enable
    # Adds a quick mention button to the message actions bar
```
## quickReply
```nix
programs.nixcord.config.plugins.quickReply.enable
    # Reply to (ctrl + up/down) and edit (ctrl + shift + up/down) messages via keybinds
programs.nixcord.config.plugins.quickReply.shouldMention
    # Ping reply by default
    # type: str
    # default: "followNoReplyMention"
    # other options are "disabled" or "enabled"
```
## reactErrorDecoder
```nix
programs.nixcord.config.plugins.reactErrorDecoder.enable
    # Replaces "Minifed React Error" with the actual error.
```
## readAllNotificationsButton
```nix
programs.nixcord.config.plugins.readAllNotificationsButton.enable
    # Read all server notifications with a single button click!
```
## relationshipNotifier
```nix
programs.nixcord.config.plugins.relationshipNotifier.enable
    # Notifies you when a friend, group chat, or server removes you.
programs.nixcord.config.plugins.relationshipNotifier.notices
    # Also show a notice at the top of your screen when removed
    # (use this if you don't want to miss any notifications).
programs.nixcord.config.plugins.relationshipNotifier.offlineRemovals
    # Notify you when starting discord if you were removed while offline.
    # default: true
programs.nixcord.config.plugins.relationshipNotifier.friends
    # Notify when a friend removes you
    # default: true
programs.nixcord.config.plugins.relationshipNotifier.friendRequestCancels
    # Notify when a friend request is cancelled
    # default: true
programs.nixcord.config.plugins.relationshipNotifier.servers
    # Notify when removed from a server
    # default: true
programs.nixcord.config.plugins.relationshipNotifier.groups
    # Notify when removed from a group chat
    # default: true
```
## replaceGoogleSearch
```nix
programs.nixcord.config.plugins.replaceGoogleSearch.enable
    # Replaces the Google search with different Engines
programs.nixcord.config.plugins.replaceGoogleSearch.customEngineName
    # Name of the custom search engine
    # type: str
    # default: ""
programs.nixcord.config.plugins.replaceGoogleSearch.customEngineURL
    # The URL of your Engine
    # type: str
    # default: ""
```
## replyTimestamp
```nix
programs.nixcord.config.plugins.replyTimestamp.enable
    # Shows a timestamp on replied-message previews
```
## revealAllSpoilers
```nix
programs.nixcord.config.plugins.revealAllSpoilers.enable
    # Reveal all spoilers in a message by Ctrl-clicking a spoiler, or in the chat with Ctrl+Shift-click
```
## reverseImageSearch
```nix
programs.nixcord.config.plugins.reverseImageSearch.enable
    # Adds ImageSearch to image context menus
```
## reviewDB
```nix
programs.nixcord.config.plugins.reviewDB.enable
    # Review other users (Adds a new settings to profiles)
programs.nixcord.config.plugins.reviewDB.notifyReviews
    # Notify about new reviews on startup
    # default: true
programs.nixcord.config.plugins.reviewDB.showWarning
    # Display warning to be respectful at the top of the reviews list
    # default: true
programs.nixcord.config.plugins.reviewDB.hideTimestamps
    # Hide timestamps on reviews
programs.nixcord.config.plugins.reviewDB.hideBlockedUsers
    # Hide reviews from blocked users
    # default: true
```
## roleColorEverywhere
```nix
programs.nixcord.config.plugins.roleColorEverywhere.enable
    # Adds the top role color anywhere possible
    # default: true
programs.nixcord.config.plugins.roleColorEverywhere.chatMentions
    # Show role colors in chat mentions (including in the message box)
    # default: true
programs.nixcord.config.plugins.roleColorEverywhere.memberList
    # Show role colors in member list role headers
    # default: true
programs.nixcord.config.plugins.roleColorEverywhere.voiceUsers
    # Show role colors in the voice chat user list
    # default: true
programs.nixcord.config.plugins.roleColorEverywhere.reactorList
    # Show role colors in the reactors list
    # default: true
```
## searchReply
```nix
programs.nixcord.config.plugins.searchReply.enable
    # Adds a reply button to search results
```
## secretRingToneEnabler
```nix
programs.nixcord.config.plugins.secretRingToneEnabler.enable
    # Always play the secret version of the discord ringtone
    # (except during special ringtone events)
```
## summaries
```nix
programs.nixcord.config.plugins.summaries.enable
    # Enables Discord's experimental Summaries feature on every server, displaying AI generated summaries of conversations
programs.nixcord.config.plugins.summaries.summaryExpiryThresholdDays
    # The time in days before a summary is removed. Note that only up to 50 summaries are kept per channel
    # type: number
    # default: 3
```
## sendTimestamps
```nix
programs.nixcord.config.plugins.sendTimestamps.enable
    # Send timestamps easily via chat box button & text shortcuts. Read the extended description!
programs.nixcord.config.plugins.sendTimestamps.replaceMessageContents
    # Replace timestamps in message contents
    # default: true
```
## serverInfo
```nix
programs.nixcord.config.plugins.serverInfo.enable
    # Allows you to view info about a server
```
## serverListIndicators
```nix
programs.nixcord.config.plugins.serverListIndicators.enable
    # Add online friend count or server count in the server list
programs.nixcord.config.plugins.serverListIndicators.mode
    # mode
    # type: str
    # default: "onlyFriendCount"
    # one of:
    #   "onlyFriendCount"
    #   "onlyServerCount"
    #   "both"
```
## shikiCodeblocks
```nix
programs.nixcord.config.plugins.shikiCodeblocks.enable
    # Brings vscode-style codeblocks into Discord, powered by Shiki
programs.nixcord.config.plugins.shikiCodeblocks.theme
    # Github URL for the theme from shiki repo
    # type: str
    # default: "https://raw.githubusercontent.com/shikijs/shiki/0b28ad8ccfbf2615f2d9d38ea8255416b8ac3043/packages/shiki/themes/dark-plus.json"
programs.nixcord.config.plugins.shikiCodeblocks.tryHljs
    # Use the more lightweight default Discord highlighter and theme.
    # type: str
    # default: "SECONDARY"
    # one of:
    #   "NEVER"
    #   "SECONDARY"
    #   "PRIMARY"
    #   "ALWAYS"
programs.nixcord.config.plugins.shikiCodeblocks.useDevIcon
    # How to show language icons on codeblocks
    # type: str
    # default: "GREYSCALE"
    # can also be "COLOR" or "DISABLED"
programs.nixcord.config.plugins.shikiCodeblocks.bgOpacity
    # Background opacity
    # type: float
    # default: 100.0
```
## showAllMessageButtons
```nix
programs.nixcord.config.plugins.showAllMessageButtons.enable
    # Always show all message buttons no matter if you are holding the shift key or not.
```
## showAllRoles
```nix
programs.nixcord.config.plugins.showAllRoles.enable
    # Show all roles in new profiles.
```
## showConnections
```nix
programs.nixcord.config.plugins.showConnections.enable
    # Show connected accounts in user popouts
programs.nixcord.config.plugins.showConnections.iconSize
    # Icon size (px)
    # type: int
    # default: 32
programs.nixcord.config.plugins.showConnections.iconSpacing
    # Icon margin
    # type: str
    # default: "cozy"
    # one of:
    #   "compact"
    #   "cozy"
    #   "roomy"
```
## showHiddenChannels
```nix
programs.nixcord.config.plugins.showHiddenChannels.enable
    # Show channels that you do not have access to view.
programs.nixcord.config.plugins.showHiddenChannels.hideUnreads
    # Hide Unreads
    # default: true
programs.nixcord.config.plugins.showHiddenChannels.showMode
    # The mode used to display hidden channels.
    # type: str
    # default: "plain"
    # can also be "muted"
programs.nixcord.config.plugins.showHiddenChannels.showHiddenChannels
    # Whether the allowed users and roles dropdown on hidden channels should be open by default
    # default: true
```
## showHiddenThings
```nix
programs.nixcord.config.plugins.showHiddenThings.enable
    # Displays various hidden & moderator-only things regardless of permissions.
programs.nixcord.config.plugins.showHiddenThings.showTimouts
    # Show member timeout icons in chat.
    # default: true
programs.nixcord.config.plugins.showHiddenThings.showInvitesPaused
    # Show the invites paused tooltip in the server list.
    # default: true
programs.nixcord.config.plugins.showHiddenThings.showModView
    # Show the member mod view context menu item in all servers.
    # default: true
programs.nixcord.config.plugins.showHiddenThings.disableDiscoveryFilters
    # Disable filters in Server Discovery search that hide servers that don't meet discovery criteria.
    # default: true
programs.nixcord.config.plugins.showHiddenThings.disableDisallowedDiscoveryFilters
    # Disable filters in Server Discovery search that hide NSFW & disallowed servers.
    # default: true
```
## showMeYourName
```nix
programs.nixcord.config.plugins.showMeYourName.enable
    # Display usernames next to nicks, or no nicks at all
programs.nixcord.config.plugins.showMeYourName.mode
    # How to display usernames and nicks
    # type: str
    # default: "user-nick"
    # one of:
    #   "user-nick"
    #   "nick-user"
    #   "user"
```
## showTimeoutDuration
```nix
programs.nixcord.config.plugins.showTimeoutDuration.enable
    # Shows how much longer a user's timeout will last, either in the timeout icon tooltip or next to it
programs.nixcord.config.plugins.showTimeoutDuration.displayStyle
    # How to display the timout duration
    # type: str
    # default: "ssalggnikool"
    # can also be "tooltip"
```
## silentMessageToggle
```nix
programs.nixcord.config.plugins.silentMessageToggle.enable
    # Adds a button to the chat bar to toggle sending a silent message.
programs.nixcord.config.plugins.silentMessageToggle.persistentState
    # Whether to persist the state of the silent message toggle when changing channels
programs.nixcord.config.plugins.silentMessageToggle.autoDiable
    # Automatically disable the silent message toggle again after sending one
    # default: true
```
## silentTyping
```nix
programs.nixcord.config.plugins.silentTyping.enable
    # Hide that you are typing
programs.nixcord.config.plugins.silentTyping.showIcon
    # Show an icon for toggling the plugin
programs.nixcord.config.plugins.silentTyping.contextMenu
    # Add option to toggle the functionality in the chat input context menu
    # default: true
programs.nixcord.config.plugins.silentTyping.isEnabled
    # Toggle functionality
    # default: true
```
## sortFriendRequests
```nix
programs.nixcord.config.plugins.sortFriendRequests.enable
    # Sorts friend requests by date of receipt
programs.nixcord.config.plugins.sortFriendRequests.showDates
    # Show dates on friend requests
```
## spotifyControls
```nix
programs.nixcord.config.plugins.spotifyControls.enable
    # Adds a Spotify player above the account panel
programs.nixcord.config.plugins.spotifyControls.hoverControls
    # Show controls on hover
programs.nixcord.config.plugins.spotifyControls.useSpotifyUris
    # Open Spotify URIs instead of Spotify URLs. Will only work if you have Spotify installed and might not work on all platforms
```
## spotifyCrack
```nix
programs.nixcord.config.plugins.spotifyCrack.enable
    # Free listen along, no auto-pausing in voice chat, and allows activity to continue playing when idling
programs.nixcord.config.plugins.spotifyCrack.noSpotifyAutoPause
    # Disable Spotify auto-pause
## spotifyCrack
    # default: true
programs.nixcord.config.plugins.spotifyCrack.enable
    # Keep Spotify activity playing when idling
```
## spotifyShareCommands
```nix
programs.nixcord.config.plugins.spotifyShareCommands.enable
    # Share your current Spotify track, album or artist via slash command (/track, /album, /artist)
```
## startupTimings
```nix
programs.nixcord.config.plugins.startupTimings.enable
    # Adds Startup Timings to the Settings menu
```
## streamerModeOnStream
```nix
programs.nixcord.config.plugins.streamerModeOnStream.enable
    # Automatically enables streamer mode when you start streaming in Discord
```
## superReactionTweaks
```nix
programs.nixcord.config.plugins.superReactionTweaks.enable
    # Customize the limit of Super Reactions playing at once, and super react by default
programs.nixcord.config.plugins.superReactionTweaks.superReactByDefault
    # Reaction picker will default to Super Reactions
    # default: true
programs.nixcord.config.plugins.superReactionTweaks.unlimitedSuperReactionPlaying
    # Remove the limit on Super Reactions playing at once
programs.nixcord.config.plugins.superReactionTweaks.superReactionPlayingLimit
    # Max Super Reactions to play at once
    # type: int
    # default: 20
```
## textReplace
```nix
programs.nixcord.config.plugins.textReplace.enable
    # Replace text in your messages. You can find pre-made rules in the
    # #textreplace-rules channel in Vencord's Server
```
## themeAttributes
```nix
programs.nixcord.config.plugins.themeAttributes.enable
    # Adds data attributes to various elements for theming purposes
```
## timeBarAllActivities
```nix
programs.nixcord.config.plugins.timeBarAllActivities.enable
    # Adds the Spotify time bar to all activities if they have start and end timestamps
```
## translate
```nix
programs.nixcord.config.plugins.translate.enable
    # Translate messages with Google Translate
programs.nixcord.config.plugins.translate.autoTranslate
    # Automatically translate your messages before sending.
    # You can also shift/right click the translate button to toggle this
programs.nixcord.config.plugins.translate.showChatBarButton
    # Show translate button in chat bar
    # default: true
```
## typingIndicator
```nix
programs.nixcord.config.plugins.typingIndicator.enable
    # Adds an indicator if someone is typing on a channel.
programs.nixcord.config.plugins.typingIndicator.includeCurrentChannel
    # Whether to show the typing indicator for the currently selected channel
    # default: true
programs.nixcord.config.plugins.typingIndicator.includeMutedChannels
    # Whether to show the typing indicator for muted channels.
programs.nixcord.config.plugins.typingIndicator.includeBlockedUsers
    # Whether to show the typing indicator for blocked users.
programs.nixcord.config.plugins.typingIndicator.indicatorMode
    # How should the indicator be displayed?
    # type: str
    # default: "both"
    # one of:
    #   "both"
    #   "avatars"
    #   "animatedDots"
```
## typingTweaks
```nix
programs.nixcord.config.plugins.typingTweaks.enable
    # Show avatars and role colours in the typing indicator
programs.nixcord.config.plugins.typingTweaks.showAvatars
    # Show avatars in the typing indicator
    # default: true
programs.nixcord.config.plugins.typingTweaks.showRoleColors
    # Show role colors in the typing indicator
    # default: true
programs.nixcord.config.plugins.typingTweaks.alternativeFormatting
    # Show a more useful message when several users are typing
    # default: true
```
## unindent
```nix
programs.nixcord.config.plugins.unindent.enable
    # Trims leading indentation from codeblocks
```
## unlockedAvatarZoom
```nix
programs.nixcord.config.plugins.unlockedAvatarZoom.enable
    # Allows you to zoom in further in the image crop tool when changing your avatar
programs.nixcord.config.plugins.unlockedAvatarZoom.zoomMultiplier
    # Zoom multiplier
    # type: int
    # default: 4
```
## unsuppressEmbeds
```nix
programs.nixcord.config.plugins.unsuppressEmbeds.enable
    # Allows you to unsuppress embeds in messages
```
## userVoiceShow
```nix
programs.nixcord.config.plugins.userVoiceShow.enable
    # Shows whether a User is currently in a voice channel somewhere in their profile
programs.nixcord.config.plugins.userVoiceShow.showInUserProfileModal
    # Show a user's voice channel in their profile modal
    # default: true
programs.nixcord.config.plugins.userVoiceShow.showVoiceChannelSectionHeader
    # Whether to show "IN A VOICE CHANNEL" above the join button
    # default: true
```
## USRBG
```nix
programs.nixcord.config.plugins.USRBG.enable
    # Displays user banners from USRBG, allowing anyone to get a banner without Nitro
programs.nixcord.config.plugins.USRBG.nitroFirst
    # Use Nitro instead of USRBG banner if both are present
    # default: true
programs.nixcord.config.plugins.USRBG.voiceBackground
    # Use USRBG banners as voice chat backgrounds
    # default: true
```
## validReply
```nix
programs.nixcord.config.plugins.validReply.enable
    # Fixes "Message could not be loaded" upon hovering over the reply
```
## validUser
```nix
programs.nixcord.config.plugins.validUser.enable
    # Fix mentions for unknown users showing up as '@unknown-user' (hover over a mention to fix it)
```
## voiceChatDoubleClick
```nix
programs.nixcord.config.plugins.voiceChatDoubleClick.enable
    # Join voice chats via double click instead of single click
```
## vcNarrator
```nix
programs.nixcord.config.plugins.vcNarrator.enable
    # Announces when users join, leave, or move voice channels via narrator
programs.nixcord.config.plugins.vcNarrator.voice
    # Narrator Voice
    # type: str
    # default: "English (America) espeak-ng"
    # voice string from mozilla SpeechSynthesisVoice
programs.nixcord.config.plugins.vcNarrator.volume
    # Narrator Volume
    # type: number
    # default: 1
    # example: 0.25
programs.nixcord.config.plugins.vcNarrator.rate
    # Narrator Speed
    # type: number
    # default: 1
programs.nixcord.config.plugins.vcNarrator.sayOwnName
    # Say own name
programs.nixcord.config.plugins.vcNarrator.latinOnly
    # Strip non latin characters from names before saying them
programs.nixcord.config.plugins.vcNarrator.joinMessage
    # Join Message
    # type: str
    # default: "{{USER}} joined"
programs.nixcord.config.plugins.vcNarrator.leaveMessage
    # Leave Message
    # type: str
    # default: "{{USER}} joined"
programs.nixcord.config.plugins.vcNarrator.moveMessage
    # Move Message
    # type: str
    # default: "{{USER}} Moved"
programs.nixcord.config.plugins.vcNarrator.muteMessage
    # Mute Message
    # type: str
    # default: "{{USER}} muted"
programs.nixcord.config.plugins.vcNarrator.unmuteMessage
    # Unmute Message
    # type: str
    # default: "{{USER}} unmuted"
programs.nixcord.config.plugins.vcNarrator.deafenMessage
    # Deafen Message
    # type: str
    # default: "{{USER}} deafened"
programs.nixcord.config.plugins.vcNarrator.undeafenMessage
    # Undeafen Message
    # type: str
    # default: "{{USER}} undeafened"
```
## vencordToolbox
```nix
programs.nixcord.config.plugins.vencordToolbox.enable
    # Adds a button next to the inbox button in the channel header that houses Vencord quick actions
```
## viewIcons
```nix
programs.nixcord.config.plugins.viewIcons.enable
    # Makes avatars and banners in user profiles clickable,
    # adds View Icon/Banner entries in the user, server and group channel context menu.
programs.nixcord.config.plugins.viewIcons.format
    # Choose the image format to use for non animated images. Animated images will always use .gif
    # type: str
    # default: "webp"
    # one of:
    #   "webp"
    #   "png"
    #   "jpg"
programs.nixcord.config.plugins.viewIcons.imgSize
    # The image size to use
    # type: int
    # default: 1024
```
## viewRaw
```nix
programs.nixcord.config.plugins.viewRaw.enable
    # Copy and view the raw content/data of any message, channel or guild
programs.nixcord.config.plugins.viewRaw.clickMethod
    # Change the button to view the raw content/data of any message.
    # type: str
    # default: "Left"
    # can also be "Right"
```
## voiceDownload
```nix
programs.nixcord.config.plugins.voiceDownload.enable
    # Adds a download to voice messages. (Opens a new browser tab)
```
## voiceMessages
```nix
programs.nixcord.config.plugins.voiceMessages.enable
    # Allows you to send voice messages like on mobile.
    # To do so, right click the upload button and click Send Voice Message
programs.nixcord.config.plugins.voiceMessages.noiseSuppression
    # Noise Suppression
    # default: true
programs.nixcord.config.plugins.voiceMessages.echoCancellation
    # Echo Cancellation
    # default: true
```
## volumeBooster
```nix
programs.nixcord.config.plugins.volumeBooster.enable
    # Allows you to set the user and stream volume above the default maximum.
programs.nixcord.config.plugins.volumeBooster.multiplier
    # Volume Multiplier
    # type: int
    # default: 2
```
## watchTogetherAdblock
```nix
programs.nixcord.config.plugins.watchTogetherAdblock.enable
    # Block ads in the YouTube WatchTogether activity via AdGuard
```
## whoReacted
```nix
programs.nixcord.config.plugins.whoReacted.enable
    # Renders the avatars of users who reacted to a message
```
## xSOverlay
```nix
programs.nixcord.config.plugins.xSOverlay.enable
    # Forwards discord notifications to XSOverlay, for easy viewing in VR
programs.nixcord.config.plugins.xSOverlay.botNotifications
    # Allow bot notifications
programs.nixcord.config.plugins.xSOverlay.serverNotifications
    # Allow server notifications
    # default: true
programs.nixcord.config.plugins.xSOverlay.dmNotifications
    # Allow Direct Message notifications
    # default: true
programs.nixcord.config.plugins.xSOverlay.groupDmNotifications
    # Allow Group DM notifications
    # default: true
programs.nixcord.config.plugins.xSOverlay.callNotifications
    # Allow call notifications
    # default: true
programs.nixcord.config.plugins.xSOverlay.pingColor
    # User mention color
    # type: str
    # default: "#7289da"
programs.nixcord.config.plugins.xSOverlay.channelPingColor
    # Channel mention color
    # type: str
    # default: "#8a2be2"
programs.nixcord.config.plugins.xSOverlay.soundPath
    # Notification sound (default/warning/error)
    # type: str
    # default: "default"
    # one of:
    #   "default"
    #   "warning"
    #   "error"
programs.nixcord.config.plugins.xSOverlay.timeout
    # Notification duration (secs)
    # type: int
    # default: 3
programs.nixcord.config.plugins.xSOverlay.lengthBasedTimeout
    # Extend duration with message length
    # default: true
programs.nixcord.config.plugins.xSOverlay.opacity
    # Notif opacity
    # type: float
    # default: 1.0
programs.nixcord.config.plugins.xSOverlay.volume
    # Volume
    # type: float
    # default: 0.2
```
