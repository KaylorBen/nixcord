# Credit to: https://github.com/nix-community/plasma-manager/blob/b7697abe89967839b273a863a3805345ea54ab56/docs/plasma-manager-options.nix
{
  stdenvNoCC,
  nixos-render-docs,
  nixcord-options,
  revision,
  lib,
  documentation-highlighter,
}:
stdenvNoCC.mkDerivation {
  name = "nixcord-options";

  nativeBuildInputs = [ nixos-render-docs ];

  src = ./manual;

  buildPhase = ''
    runHook preBuild
    mkdir -p out/highlightjs
    cp -t out/highlightjs \
      ${documentation-highlighter}/highlight.pack.js \
      ${documentation-highlighter}/LICENSE \
      ${documentation-highlighter}/mono-blue.css \
      ${documentation-highlighter}/loader.js

    cp ${./static/style.css} out/style.css

    substituteInPlace options.md \
      --replace-fail \
        '@OPTIONS_JSON@' \
        ${nixcord-options}/share/doc/nixos/options.json

    substituteInPlace manual.md \
      --replace-fail \
        '@VERSION@' \
        ${revision}

    nixos-render-docs manual html \
      --manpage-urls ./manpage-urls.json \
      --revision ${lib.trivial.revisionWithDefault revision} \
      --style style.css \
      --script highlightjs/highlight.pack.js \
      --script highlightjs/loader.js \
      --toc-depth 1 \
      --section-toc-depth 1 \
      manual.md \
      out/index.xhtml
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    dest="$out/share/doc/nixcord"
    mkdir -p "$(dirname "$dest")"
    mv out "$dest"
    runHook postInstall
  '';
}
