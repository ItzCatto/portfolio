#!/usr/bin/env bash
# Installs the "Nothing" Cinnamon desklets + wallpaper for Linux Mint Cinnamon.
# Safe to re-run. Does not touch anything outside ~/.local/share/cinnamon and ~/Pictures.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKLET_DST="$HOME/.local/share/cinnamon/desklets"
PIC_DST="$HOME/Pictures"

echo "== Nothing rice installer =="

if [ "$(id -u)" -eq 0 ]; then
    echo "Don't run this as root/sudo — desklets install into your own home directory." >&2
    exit 1
fi

echo "-- Checking for optional dependencies (used for live data in the widgets) --"
MISSING=()
for cmd in playerctl curl nmcli bluetoothctl pactl sensors; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING+=("$cmd")
    fi
done

if [ "${#MISSING[@]}" -gt 0 ]; then
    echo "Missing (optional, widgets degrade gracefully without them): ${MISSING[*]}"
    if command -v apt-get >/dev/null 2>&1; then
        read -r -p "Install them now with apt? [y/N] " ans
        if [[ "$ans" =~ ^[Yy]$ ]]; then
            # `|| true`: a broken/unsigned third-party repo (Spotify, etc.) makes
            # `apt-get update` exit non-zero even though the repos we need are fine.
            sudo apt-get update || true
            sudo apt-get install -y playerctl curl network-manager bluez pulseaudio-utils lm-sensors
        fi
    fi
else
    echo "All optional tools already present."
fi

echo "-- Installing desklets to $DESKLET_DST --"
mkdir -p "$DESKLET_DST"
for d in "$SCRIPT_DIR"/desklets/*/; do
    name="$(basename "$d")"
    rm -rf "${DESKLET_DST:?}/$name"
    cp -r "$d" "$DESKLET_DST/$name"
    echo "  installed $name"
done

echo "-- Copying wallpaper to $PIC_DST --"
mkdir -p "$PIC_DST"
cp "$SCRIPT_DIR/assets/wallpaper.svg" "$PIC_DST/nothing-wallpaper.svg"

if command -v gsettings >/dev/null 2>&1; then
    read -r -p "Set it as your desktop background now? [y/N] " ans
    if [[ "$ans" =~ ^[Yy]$ ]]; then
        gsettings set org.cinnamon.desktop.background picture-uri "file://$PIC_DST/nothing-wallpaper.svg" || true
        gsettings set org.gnome.desktop.background picture-uri "file://$PIC_DST/nothing-wallpaper.svg" || true
    fi
fi

cat <<'EOF'

== Done ==

Next steps (Cinnamon doesn't auto-place desklets, this part is manual):

1. Right-click your desktop -> "Add desklets"
2. Find "Nothing Island", "Nothing Clock", "Nothing Date", "Nothing Weather",
   "Nothing Media" in the list and click the "+" on each to add them.
3. Drag them into position (top-right for the Island to mimic the dynamic
   island look, the rest wherever you like).
4. Click the Nothing Island pill to expand/collapse it.

Recommended (optional, does the rest of the look):
  - Font:      JetBrains Mono (sudo apt install fonts-jetbrains-mono) as a
               stand-in for Nothing's proprietary "Ndot" font.
  - GTK theme: a dark theme such as "Orchis-Dark" or "WhiteSur-Dark".
  - Icons:     "Tela-dark" or "Fluent-dark" icon theme.
  - Dock:      Plank (sudo apt install plank), themed dark, for the bottom
               icon dock seen in the screenshots — Cinnamon's panel is a
               different metaphor and a dedicated dock looks much closer.

If a desklet fails to load, open Cinnamon's debugger with Alt+F2 -> "lg"
(Looking Glass) to see the JS error, or check:
  ~/.cinnamon/glass.log
EOF
