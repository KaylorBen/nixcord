# Made from nixpkgs pkg and updated with nix-update
# identical to nixpkgs source, but maintained here for
# quicker updates that don't wait on hydra

{
  esbuild,
  fetchFromGitHub,
  git,
  lib,
  nodejs,
  pnpm_9,
  pnpm,
  stdenv,
  buildWebExtension ? false,
  unstable ? false,
}:

let
  stableVersion = "1.11.5";
  stableHash = "sha256-hdlFL95DFVeUs08/wg6EA5CfV6KeUGaS9kcLGRMyNgY=";
  stablePnpmDeps = "sha256-0afgeJkK0OQWoqF0b8pHPMsiTKox84YmwBhtNWGyVAg=";

  unstableVersion = "1.11.5-unstable-2025-02-25";
  unstableRev = "8d0f312122d5f25f9f9ea7d960bade785365c579";
  unstableHash = "sha256-g60GFyKes68h6M1dlQVZRGUImjngRyimsFFKBRNYuu8=";
  unstablePnpmDeps = "sha256-g9BSVUKpn74D9eIDj/lS1Y6w/+AnhCw++st4s4REn+A=";
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

  pnpmDeps = (if unstable then pnpm else pnpm_9).fetchDeps {
    inherit (finalAttrs) pname src;
    hash = if unstable then unstablePnpmDeps else stablePnpmDeps;
  };

  nativeBuildInputs = [
    git
    nodejs
    (if unstable then pnpm.configHook else pnpm_9.configHook)
  ];

  env = {
    ESBUILD_BINARY_PATH = lib.getExe (
      esbuild.overrideAttrs (
        final: _: {
          version = "0.25.0";
          src = fetchFromGitHub {
            owner = "evanw";
            repo = "esbuild";
            rev = "v${final.version}";
            hash = "sha256-L9jm94Epb22hYsU3hoq1lZXb5aFVD4FC4x2qNt0DljA=";
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
