# Introduction {#sec-introduction}

Manage Vencord and Equicord settings and plugins declaratively with Nix!

## What is Nixcord? {#what-is-nixcord}

Nixcord allows you to:

- **Install and manage Discord variants**: Support for Discord stable, PTB, canary, and development branches
- **Integrate Vencord**: Automatically apply Vencord modifications to Discord for enhanced functionality
- **Use Vesktop**: A cross-platform Discord client that supports more features than the official client
- **Use Equibop**: A Vesktop fork with Equicord preinstalled and performance tweaks
- **Configure Dorion**: Another Discord client alternative with unique features
- **Manage user plugins**: Easily add and configure custom Vencord plugins
- **Declarative configuration**: All settings managed through Nix configuration files

## Getting Started {#getting-started}

To start using Nixcord, add it to your Home Manager configuration:

```nix
{
  programs.nixcord = {
    enable = true;
    discord.enable = true;
    vesktop.enable = true;
    equibop.enable = true;
  };
}
```

This will install Discord with Vencord plus Vesktop and Equibop with sensible defaults. For more detailed configuration options, see the [Configuration Options](#sec-options) section.
