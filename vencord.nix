# Made from nixpkgs pkg and updated with nix-update
# identical to nixpkgs source, but maintained here for
# quicker updates that don't wait on hydra

{
  esbuild,
  fetchFromGitHub,
  git,
  lib,
  nodejs,
  pnpm,
  stdenv,
  buildWebExtension ? false,
  unstable ? false,
}:

let
  stableVersion = "1.10.9";
  stableHash = "sha256-sU2eJUUw7crvzMGGBQP6rbxISkL+S5nmT3QspyYXlRQ=";

  unstableVersion = "1.10.9-unstable-2025-01-10";
  unstableRev = "3243120baaa56f65866b532b731bc3426512c90e";
  unstableHash = "sha256-ov1qLtBzLAO8k9pokOstEaeS/me+ElVvGzyFTSfaZM0=";

in
stdenv.mkDerivation (finalAttrs: {
  pname = "vencord" + lib.optionalString unstable "-unstable";
  version = if unstable then unstableVersion else stableVersion;

  src = fetchFromGitHub {
    owner = "Vendicated";
    repo = "Vencord";
    rev = if unstable then unstableRev else "v${finalAttrs.version}";
    hash = if unstable then unstableHash else stableHash;
  };

  pnpmDeps = pnpm.fetchDeps {
    inherit (finalAttrs) pname src;
    hash = "sha256-ZUwtNtOmxjhOBpYB7vuytunGBRSuVxdlQsceRmeyhhI=";
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

  meta = with lib; {
    description = "Vencord web extension" + lib.optionalString unstable " (Unstable)";
    homepage = "https://github.com/Vendicated/Vencord";
    license = licenses.gpl3Only;
    maintainers = with maintainers; [
      FlafyDev
      NotAShelf
      Scrumplex
      donteatoreo
    ];
  };
})
