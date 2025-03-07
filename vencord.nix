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
  stableVersion = "1.11.6";
  stableHash = "sha256-8KAt7yFGT/DBlg2VJ7ejsOJ67Sp5cuuaKEWK3+VpL4E=";
  stablePnpmDeps = "sha256-g9BSVUKpn74D9eIDj/lS1Y6w/+AnhCw++st4s4REn+A=";

  unstableVersion = "1.11.6-unstable-2025-03-06";
  unstableRev = "5eb443546336f18f186ebdb4938f2975d1452f5f";
  unstableHash = "sha256-SMXXB/1p3MBLP+iJUu0hCcD+0f/ZAf6+n22zCGuqMHM=";
  unstablePnpmDeps = "sha256-g9BSVUKpn74D9eIDj/lS1Y6w/+AnhCw++st4s4REn+A=";

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
