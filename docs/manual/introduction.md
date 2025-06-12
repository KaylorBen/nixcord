# Introduction {#sec-introduction}

Nixcord is a comprehensive Discord management system for Nix/NixOS that integrates Discord, Vencord, Vesktop, and Dorion into your system configuration. It provides a seamless way to manage Discord clients with customizations through Home Manager.

## What is Nixcord? {#what-is-nixcord}

Nixcord allows you to:

- **Install and manage Discord variants**: Support for Discord stable, PTB, canary, and development branches
- **Integrate Vencord**: Automatically apply Vencord modifications to Discord for enhanced functionality
- **Use Vesktop**: A cross-platform Discord client that supports more features than the official client
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
  };
}
```

This will install Discord with Vencord and Vesktop with sensible defaults. For more detailed configuration options, see the [Configuration Options](#sec-options) section.
