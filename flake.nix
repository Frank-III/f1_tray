{
  description = "F1 Tray App";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        rust = (pkgs.rust-bin.stable."1.74.1".default.override {
          extensions = [ 
            "cargo"
            "clippy"
            "rust-src"
            "rust-analyzer"
            "rustc"
            "rustfmt"
          ];
        });
      libraries = with pkgs;[
        webkitgtk
        gtk3
        libappindicator-gtk3
        cairo
        gdk-pixbuf
        glib
        dbus
        openssl_3
        librsvg
      ];
      pacakges = with pkgs; [
        rust
        pkg-config
        dbus
        openssl_3
        glib
        gtk3
        libsoup
        webkitgtk
        librsvg
        nodejs_18
        nodePackages.pnpm
          # pkgs.yarn

        nodePackages.typescript
        nodePackages.typescript-language-server
        # rust-analyzer-unwrapped
        pkg-config
      ];
      in
      with pkgs;
      {
        devShells.default = mkShell {
          buildInputs = pacakges; 

          RUST_SRC_PATH="${rust}/lib/rustlib/src/rust/library";

          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH
            export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS
            ln -fsT ${rust} ./.direnv/rust
          '';
        };
      }
    );
}