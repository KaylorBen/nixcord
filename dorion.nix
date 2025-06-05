{
  lib,
  stdenvNoCC,
  fetchurl,
  autoPatchelfHook,
  dpkg,
  glib-networking,
  gst_all_1,
  libappindicator,
  libayatana-appindicator,
  webkitgtk_4_0,
  wrapGAppsHook3,
  undmg,
  rpm,
}:

let
  pname = "dorion";
  version = "6.7.1";

  sources = {
    "x86_64-darwin" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_x64.dmg";
      hash = "sha256-+rLHv/N3L488krfw+GlFLhWWjj49pkJjz+s4fkHdL4Q=";
      unpackCmd = "undmg \"$curSrc\"";
    };
    "aarch64-darwin" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_aarch64.dmg";
      hash = "sha256-7gLIkx5LTtjadcu0vPLM0zroxQXytMKE0WbVJ1bCQZ4=";
      unpackCmd = "undmg \"$curSrc\"";
    };
    "x86_64-linux" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}-1.x86_64.rpm";
      hash = "sha256-ME+lgTMapB/NScmaBCIQsQcOIDEmGkYpsYpgodq0WQs=";
      unpackCmd = "rpm2cpio \"$curSrc\" | cpio -idmv";
    };
    "aarch64-linux" = {
      url = "https://github.com/SpikeHD/Dorion/releases/download/v${version}/Dorion_${version}_arm64.deb";
      hash = "sha256-sAxDbktNXilpoFoRi0k7N8mNMs9T+/R+j6KuCxZRhbw=";
      unpackCmd = "dpkg -X \"$curSrc\" .";
    };
  };

  sourceInfo =
    sources.${stdenvNoCC.hostPlatform.system}
      or (throw "Unsupported platform: ${stdenvNoCC.hostPlatform.system}");

  buildInputs = lib.optionals stdenvNoCC.isLinux [
    autoPatchelfHook
    glib-networking
    gst_all_1.gst-plugins-bad
    gst_all_1.gst-plugins-base
    gst_all_1.gst-plugins-good
    webkitgtk_4_0
    libappindicator
    libayatana-appindicator
  ];

  nativeBuildInputs =
    lib.optionals stdenvNoCC.isDarwin [ undmg ]
    ++ lib.optionals stdenvNoCC.isLinux [
      autoPatchelfHook
      wrapGAppsHook3
    ]
    ++ lib.optionals (lib.hasSuffix "rpm" sourceInfo.url) [ rpm ]
    ++ lib.optionals (lib.hasSuffix "deb" sourceInfo.url) [ dpkg ];
in
stdenvNoCC.mkDerivation (finalAttrs: {
  inherit
    pname
    version
    buildInputs
    nativeBuildInputs
    ;

  src = fetchurl {
    url = sourceInfo.url;
    hash = sourceInfo.hash;
  };

  unpackCmd = sourceInfo.unpackCmd;

  sourceRoot = lib.optionalString stdenvNoCC.isDarwin "Dorion.app";

  runtimeDependencies = lib.optionals stdenvNoCC.isLinux [
    glib-networking
    libappindicator
    libayatana-appindicator
  ];

  installPhase =
    if stdenvNoCC.isDarwin then
      ''
        runHook preInstall

        mkdir -p "$out/Applications"
        cp -r . "$out/Applications/Dorion.app"

        runHook postInstall
      ''
    else
      ''
        runHook preInstall

        mkdir -pv "$out"
        mv -v {bin,lib,share} "$out"

        runHook postInstall
      '';

  meta = {
    description = "Tiny alternative Discord client";
    homepage = "https://github.com/SpikeHD/Dorion";
    license = lib.licenses.gpl3Only;
    mainProgram = "dorion";
    maintainers = with lib.maintainers; [ aleksana ];
    platforms = lib.platforms.unix;
    sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
  };
})
