{
  pname,
  version,
  src,
  meta,
  binaryName,
  desktopName,
  autoPatchelfHook,
  makeDesktopItem,
  lib,
  stdenv,
  stdenvNoCC,
  wrapGAppsHook3,
  makeShellWrapper,
  alsa-lib,
  at-spi2-atk,
  at-spi2-core,
  atk,
  cairo,
  cups,
  dbus,
  expat,
  fontconfig,
  freetype,
  gdk-pixbuf,
  glib,
  gtk3,
  libcxx,
  libdrm,
  libglvnd,
  libnotify,
  libpulseaudio,
  libuuid,
  libva,
  libX11,
  libXScrnSaver,
  libXcomposite,
  libXcursor,
  libXdamage,
  libXext,
  libXfixes,
  libXi,
  libXrandr,
  libXrender,
  libXtst,
  libxcb,
  libxshmfence,
  libgbm,
  nspr,
  nss,
  pango,
  systemdLibs,
  libappindicator-gtk3,
  libdbusmenu,
  pipewire,
  libunity,
  speechd-minimal,
  wayland,
  withOpenASAR ? false,
  openasar,
  withVencord ? false,
  vencord,
  withTTS ? true,
  enableAutoscroll ? false,
  commandLineArgs ? "",
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  inherit
    pname
    version
    src
    meta
    ;

  nativeBuildInputs = [
    alsa-lib
    autoPatchelfHook
    cups
    libdrm
    libuuid
    libXdamage
    libX11
    libXScrnSaver
    libXtst
    libxcb
    libxshmfence
    libgbm
    nss
    wrapGAppsHook3
    makeShellWrapper
  ];

  dontWrapGApps = true;

  libPath = lib.makeLibraryPath (
    [
      libcxx
      systemdLibs
      libpulseaudio
      libdrm
      libgbm
      stdenv.cc.cc
      alsa-lib
      atk
      at-spi2-atk
      at-spi2-core
      cairo
      cups
      dbus
      expat
      fontconfig
      freetype
      gdk-pixbuf
      glib
      gtk3
      libglvnd
      libnotify
      libX11
      libXcomposite
      libunity
      libuuid
      libva
      libXcursor
      libXdamage
      libXext
      libXfixes
      libXi
      libXrandr
      libXrender
      libXtst
      nspr
      libxcb
      pango
      pipewire
      libXScrnSaver
      libappindicator-gtk3
      libdbusmenu
      wayland
    ]
    ++ lib.optionals withTTS [ speechd-minimal ]
  );

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/{bin,opt/${binaryName},share/pixmaps,share/icons/hicolor/256x256/apps}"
    mv * "$out/opt/${binaryName}"

    chmod +x "$out/opt/${binaryName}/${binaryName}"
    patchelf --set-interpreter ${stdenv.cc.bintools.dynamicLinker} \
        "$out/opt/${binaryName}/${binaryName}"

    wrapProgramShell $out/opt/${binaryName}/${binaryName} \
        "''${gappsWrapperArgs[@]}" \
        --add-flags "\''${NIXOS_OZONE_WL:+\''${WAYLAND_DISPLAY:+--ozone-platform=wayland --enable-features=WaylandWindowDecorations --enable-wayland-ime=true}}" \
        ${lib.strings.optionalString withTTS ''
          --run 'if [[ "''${NIXOS_SPEECH:-default}" != "False" ]]; then NIXOS_SPEECH=True; else unset NIXOS_SPEECH; fi' \
          --add-flags "\''${NIXOS_SPEECH:+--enable-speech-dispatcher}" \
        ''} \
        ${lib.strings.optionalString enableAutoscroll "--add-flags \"--enable-blink-features=MiddleClickAutoscroll\""} \
        --prefix XDG_DATA_DIRS : "${gtk3}/share/gsettings-schemas/${gtk3.name}/" \
        --prefix LD_LIBRARY_PATH : "${finalAttrs.libPath}:$out/opt/${binaryName}" \
        --add-flags ${lib.escapeShellArg commandLineArgs}

    ln -s "$out/opt/${binaryName}/${binaryName}" "$out/bin/"
    # Without || true the install would fail on case-insensitive filesystems
    ln -s "$out/opt/${binaryName}/${binaryName}" "$out/bin/${lib.strings.toLower binaryName}" || true

    ln -s "$out/opt/${binaryName}/discord.png" "$out/share/pixmaps/${pname}.png"
    ln -s "$out/opt/${binaryName}/discord.png" "$out/share/icons/hicolor/256x256/apps/${pname}.png"

    ln -s "$desktopItem/share/applications" "$out/share/"

    runHook postInstall
  '';

  postInstall =
    lib.strings.optionalString withOpenASAR ''
      cp -f ${openasar} $out/opt/${binaryName}/resources/app.asar
    ''
    + lib.strings.optionalString withVencord ''
      mv $out/opt/${binaryName}/resources/app.asar $out/opt/${binaryName}/resources/_app.asar
      mkdir $out/opt/${binaryName}/resources/app.asar
      echo '{"name":"discord","main":"index.js"}' > $out/opt/${binaryName}/resources/app.asar/package.json
      echo 'require("${vencord}/patcher.js")' > $out/opt/${binaryName}/resources/app.asar/index.js
    '';

  desktopItem = makeDesktopItem {
    name = pname;
    exec = binaryName;
    icon = pname;
    inherit desktopName;
    genericName = meta.description;
    categories = [
      "Network"
      "InstantMessaging"
    ];
    mimeTypes = [ "x-scheme-handler/discord" ];
    startupWMClass = "discord";
  };
})
