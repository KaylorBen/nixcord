# Made from nixpkgs pkg and updated with nix-update
# identical to nixpkgs source, but maintained here for
# quicker updates that don't wait on hydra

{
  esbuild,
  fetchFromGitHub,
  git,
  lib,
  nodejs,
  stdenv,
  buildWebExtension ? false,
  unstable ? false,
  pnpm,
  fetchurl,
}:

let
  stableVersion = "1.11.8";
  stableHash = "sha256-Ej04ONaeNt55mbQ5RTKM4MySYsw3UJky9ZK9h1gMEzo=";
  stablePnpmDeps = "sha256-hO6QKRr4jTfesRDAEGcpFeJmGTGLGMw6EgIvD23DNzw=";

  unstableVersion = "1.11.9-unstable-2025-04-10";
  unstableRev = "77bed92c575ced3228bf3e7ba8a1a6cd24362acf";
  unstableHash = "sha256-/CJt4CZ9R1xB72Zwc76te51Fb3q4KHuzDxP3jWGzW8E=";
  unstablePnpmDeps = "sha256-hO6QKRr4jTfesRDAEGcpFeJmGTGLGMw6EgIvD23DNzw=";

  # Due to pnpm package 10.5.2 there is a issue when building.
  # Substituting pnpm with version 10.4.1 fixes this issue.
  # This should be fixed in a newer version of pnpm.
  pnpm_10-4 = pnpm.overrideAttrs (oldAttrs: {
    version = "10.4.1";
    src = fetchurl {
      url = "https://registry.npmjs.org/pnpm/-/pnpm-10.4.1.tgz";
      sha256 = "sha256-S3Aoh5hplZM9QwCDawTW0CpDvHK1Lk9+k6TKYIuVkZc=";
    };
  });
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

  pnpmDeps = pnpm_10-4.fetchDeps {
    inherit (finalAttrs) pname src;
    hash = if unstable then unstablePnpmDeps else stablePnpmDeps;
  };

  nativeBuildInputs = [
    git
    nodejs
    pnpm_10-4.configHook
  ];

  env = {
    ESBUILD_BINARY_PATH = lib.getExe (
      esbuild.overrideAttrs (
        final: _: {
          version = "0.25.1";
          src = fetchFromGitHub {
            owner = "evanw";
            repo = "esbuild";
            rev = "v${final.version}";
            hash = "sha256-vrhtdrvrcC3dQoJM6hWq6wrGJLSiVww/CNPlL1N5kQ8=";
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
    cp -r dist/${lib.optionalString buildWebExtension "chromium-unpacked/"} "$out"
    runHook postInstall
  '';

  meta = {
    description = "Vencord web extension" + lib.optionalString unstable " (Unstable)";
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
