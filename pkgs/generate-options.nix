{
  stdenvNoCC,
  lib,
  buildNpmPackage,
  nodejs,
  cacert,
  vencord,
  equicord,
  nix,
}:
stdenvNoCC.mkDerivation {
  name = "nixcord-plugin-options";
  version = "generated";

  src = buildNpmPackage {
    pname = "generate-plugin-options";
    version = "1.0.0";
    src = lib.cleanSource ../scripts/generate-plugin-options;
    npmDepsHash = "sha256-wUSk0wTdNOG+QqfAJxe0DjuYemyoT/ZxcdkzagtsIIU=";
    dontNpmBuild = true;
    installPhase = ''
      mkdir -p "$out"
      cp -r src "$out/"
      cp -r tests "$out/"
      cp package.json "$out/"
      cp tsconfig.json "$out/"
      cp vitest.config.ts "$out/"
      cp -r node_modules "$out/"
    '';
  };

  nativeBuildInputs = [
    nodejs
    cacert
    nix
  ];

  doCheck = true;
  checkPhase = ''
    runHook preCheck
    cp -r $src $TMPDIR/test-src
    chmod -R +w $TMPDIR/test-src
    cd $TMPDIR/test-src
    ./node_modules/.bin/vitest run
    runHook postCheck
  '';

  installPhase = ''
    runHook preInstall

    ${lib.getExe nodejs} --import tsx src/index.ts \
      --vencord "${vencord.src}" \
      --vencord-plugins src/plugins \
      --equicord "${equicord.src}" \
      --equicord-plugins src/equicordplugins \
      --output "$out/dummy.nix" \
      --verbose

    NIX_EVAL_USER="''${USER:-nix-eval}"
    NIX_EVAL_STATE_DIR="$TMPDIR/nix-eval-state"
    mkdir -p \
      "$NIX_EVAL_STATE_DIR" \
      "$NIX_EVAL_STATE_DIR/profiles/per-user/$NIX_EVAL_USER" \
      "$NIX_EVAL_STATE_DIR/gcroots/per-user/$NIX_EVAL_USER" \
      "$NIX_EVAL_STATE_DIR/temproots" \
      "$NIX_EVAL_STATE_DIR/logs"

    export USER="$NIX_EVAL_USER"
    export HOME="''${HOME:-$TMPDIR}"
    export NIX_REMOTE="''${NIX_REMOTE:-local}"
    export NIX_STATE_DIR="$NIX_EVAL_STATE_DIR"
    export NIX_LOG_DIR="$NIX_EVAL_STATE_DIR/logs"

    for nixFile in "$out/plugins"/*.nix; do
      if ! nix-instantiate --parse "$nixFile" > /dev/null 2>&1; then
        echo "ERROR: Invalid Nix syntax in $nixFile"
        nix-instantiate --parse "$nixFile" 2>&1 || true
        exit 1
      fi
    done

    runHook postInstall
  '';
}
