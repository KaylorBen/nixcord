{cfg, mkIf}:
[
  (mkIf (cfg.config.notifyAboutUpdates || cfg.config.autoUpdate || cfg.config.autoUpdateNotification) ''
    Nixcord is now pinned to a specific Vencord version to ensure compatability. Config options relating to auto-update no longer function. To update Nixcord to the latest version, use nixos-rebuild
  '')
  (mkIf (!builtins.isNull cfg.package) ''
    nixcord.package has been moved to nixcord.discord.package
  '')
  (mkIf (!builtins.isNull cfg.vencord.enable) ''
    nixcord.vencord has been moved to nixcord.discord.vencord
  '')
  (mkIf (!builtins.isNull cfg.openASAR.enable) ''
    nixcord.openASAR has been moved to nixcord.discord.openASAR
  '')
  (mkIf (!builtins.isNull cfg.vesktopPackage) ''
    nixcord.vesktopPackage has been moved to nixcord.vesktop.package
  '')
  (mkIf (!builtins.isNull cfg.config.plugins.ignoreActivities.allowedIds) ''
    nixcord.config.plugins.ignoreActivities.allowedIds is deprecated and replaced by nixcord.config.plugins.ignoreActivities.idsList
  '')
  (mkIf cfg.config.plugins.watchTogetherAdblock.enable ''
    nixcord.config.plugins.watchTogetherAdblock is deprecated and replaced by nixcord.config.plugins.youtubeAdblock which provides more functionality
  '')
  (mkIf cfg.config.plugins.maskedLinkPaste.enable ''
    nixcord.config.plugins.maksedLinkPaste is deprecated since it is a discord stock feature and redundant.
  '')
  (mkIf cfg.config.plugins.automodContext.enable ''
    nixcord.config.plugins.automodContext is deprecated since it is a discord stock feature and redundant.
  '')
  (mkIf cfg.config.plugins.showAllRoles.enable ''
    nixcord.config.plugins.showAllRoles is deprecated since it is a discord stock feature and redundant.
  '')
  (mkIf cfg.config.plugins.timeBarAllActivities.enable ''
    nixcord.config.plugins.timeBarAllActivities is deprecated since it is a discord stock feature and redundant.
  '')
  (mkIf cfg.config.plugins.noDefaultHangStatus.enable ''
    nixcord.config.plugins.noDefaultHangStatus is deprecated since discord fixed this issue and removed the hang status.
  '')
  (mkIf (!cfg.config.plugins.userVoiceShow.showVoiceChannelSectionHeader) ''
    nixcord.config.plugins.userVoiceShow.showVoiceChannelSectionHeader is deprecated.
  '')
  (mkIf cfg.config.plugins.searchReply.enable ''
    nixcord.config.plugins.searchReply is deprecated. Plugin has been renamed fullSearchContext
  '')
]
