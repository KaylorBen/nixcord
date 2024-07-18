This is a document of all settings with unintuitive options.
For a list of all plugins, please check [plugins.nix](./plugins.nix) or [Vencord](https://github.com/Vendicated/Vencord)
I wish more plugin authors used enums that mapped to strings,
but oh well. At this point the change will have to come here
and not upstream since changing config layout would cause
breaking issues.
```nix
{
  nixcord.config.plugins = {
    AnonymiseFileNames.method = 0; # Random Characters
                            # = 1; # Consistent
                            # = 2; # Timestamp
    BetterFolders.showFolderIcon = 0; # Never
                               # = 1; # Always
                               # = 2; # When more than one folder is expanded
    CustomRPC = {
      type = 0; # Playing
         # = 1; # Streaming
         # = 2; # Listening
         # = 3; # Watching
         # = 4; # Competing
      timestampMode = 0; # None
                  # = 1; # Since discord open
                  # = 2; # Same as your current time
                  # = 3; # Custom
    };
    Dearrow.replaceElements = 0; # Everything (Titles & Thumbnails)
                          # = 1; # Titles
                          # = 2; # Thumbnails
    NewGuildSettings.messages = 0; # All messages
                            # = 1; # Only @mentions
                            # = 2; # Nothing
                            # = 3; # Server default
    OverrideForumDefaults = {
      defaultLayout = 1; # List (why is this 1 based indexing)
                  # = 2; # Gallery
      defaultSortOrder = 0; # Recently Active (and this is 0 based)
                     # = 1; # Date Posted
    };
    PartyMode.superIntensePartyMode = 0; # Normal
                                  # = 1; # Better
                                  # = 2; # Project X

    PermissionsViewer.permissionsSortOrder = 0; # Highest Role
                                         # = 1; # Lowest Role
    PinDMs.pinOrder = 0; # Most recent message
                  # = 1; Custom (right click channels to reorder)
    PronounDB.pronounSource = 0; # Prefer PronounDB, fall back to Discord
                          # = 1; # Prefer Discord, fall back to PronounDB (might lead to inconsistency between pronouns in chat and profile)
    QuickReply.shouldMention = 0; # Disabled
                           # = 1; # Enabled
                           # = 2; # Follow NoReplyMention
    ServerListIndicators.mode = 1; # Only server count
                            # = 2; # Only online friend count
                            # = 3; # Both server and online friend counts
    ShowConnections.iconSpacing = 0; # Compact
                              # = 1; # Cozy
                              # = 2; # Roomy
    ShowHiddenChannels.showMode = 0; # Plain style with Lock Icon instead
                              # = 1; # Muted style with hidden eye icon on the right
    TypingIndicator.indicatorMode = 1; # Animated dots
                                # = 2; # Avatars
                                # = 3; # Avatars and animated dots
  };
}
```
For options that have specific strings related to their option, please search
for the corresponding option in the source code. At some point I will try to
make an effort to provide a manual page entry for all the options, but for
the current version its not a top priority.

> The best way to edit the config is still to generate a settings.json from
> Vencord, and then copy the structure of the config you want over to nix code.
