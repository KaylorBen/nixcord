{
  esbuild,
  fetchFromGitHub,
  git,
  lib,
  nodejs,
  pnpm,
  stdenv,
  buildWebExtension ? false,
}:
stdenv.mkDerivation (finalAttrs: {
  pname = "vencord";
  version = "1.10.8-unstable-2024-12-11";

  src = fetchFromGitHub {
    owner = "Vendicated";
    repo = "Vencord";
    rev = "464c4a9b614a93443575acfd160388d3eb09cb2f";
    hash = "sha256-4G3RUJO7lfHoSdm60SBpLotKpdEzFp8p2hhc3qbmLcc=";
  };

  pnpmDeps = pnpm.fetchDeps {
    inherit (finalAttrs) pname src;

    hash = "sha256-vVzERis1W3QZB/i6SQR9dQR56yDWadKWvFr+nLTQY9Y=";
  };

  nativeBuildInputs = [
    git
    nodejs
    pnpm.configHook
  ];

  env = {
    ESBUILD_BINARY_PATH = lib.getExe (
      esbuild.overrideAttrs (
        final: _: {
          version = "0.15.18";
          src = fetchFromGitHub {
            owner = "evanw";
            repo = "esbuild";
            rev = "v${final.version}";
            hash = "sha256-b9R1ML+pgRg9j2yrkQmBulPuLHYLUQvW+WTyR/Cq6zE=";
          };
          vendorHash = "sha256-+BfxCyg0KkDQpHt/wycy/8CTG6YBA/VJvJFhhzUnSiQ=";
        }
      )
    );
    VENCORD_REMOTE = "${finalAttrs.src.owner}/${finalAttrs.src.repo}";
    VENCORD_HASH = "${finalAttrs.version}";
  };

  buildPhase = ''
    runHook preBuild

    pnpm run ${if buildWebExtension then "buildWeb" else "build"} \
      -- --standalone --disable-updater

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    cp -r dist/${lib.optionalString buildWebExtension "chromium-unpacked/"} $out

    runHook postInstall
  '';

  meta = {
    description = "Vencord web extension";
    homepage = "https://github.com/Vendicated/Vencord";
    license = lib.licenses.gpl3Only;
    maintainers = with lib.maintainers; [
      donteatoreo
      FlafyDev
      NotAShelf
      Scrumplex
    ];
  };
})