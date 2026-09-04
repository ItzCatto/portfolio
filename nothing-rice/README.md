# Nothing rice for Linux Mint Cinnamon

A Cinnamon-desklet recreation of [this KDE "Nothing" rice](https://www.reddit.com/r/unixporn/comments/1vpk4h9/kde_nothing_laptop_1/),
adapted for Linux Mint Cinnamon.

## Read this first

The original rice's centerpiece — the "dynamic island" — is a **custom KDE
plasmoid** (written in QML, for KDE Plasma's widget system). Cinnamon is a
different desktop environment with its own, incompatible widget system
(**desklets/applets**, written in JavaScript/GJS). A KDE plasmoid cannot be
installed on Cinnamon, and there is no way around that from any environment,
including this one.

What's here instead is a **from-scratch Cinnamon desklet rebuild** that goes
for the same visual language (Nothing OS: black rounded cards, red accent,
monospace digits) and the same *functionality* (live clock, network/bluetooth/
volume/battery status, MPRIS media controls, CPU/RAM/temp, a "cafe mode" do-
not-disturb toggle), using tools Cinnamon actually supports.

This code was written to Cinnamon's documented desklet API but has **not**
been run against a live Cinnamon session (this was built in a headless
container with no desktop). If a desklet fails to load, open Looking Glass
(<kbd>Alt</kbd>+<kbd>F2</kbd> → type `lg`) to see the JS error — that's
Cinnamon's built-in debugger and the fastest way to spot a typo or an API
mismatch on your specific Cinnamon version.

## What's included

| Desklet | Recreates | Live data source |
|---|---|---|
| `nothing-island@itzcatto` | The expandable dynamic-island bar | nmcli, bluetoothctl, pactl, playerctl, /proc |
| `nothing-clock@itzcatto` | The big "19:36" time card | system clock |
| `nothing-date@itzcatto` | The "15 SAT" calendar card | system clock |
| `nothing-weather@itzcatto` | The "28° Villupuram" weather card | wttr.in (no API key) |
| `nothing-media@itzcatto` | The spinning-vinyl now-playing card | playerctl / MPRIS |

Click the Nothing Island's pill to expand it into the full panel; click again
to collapse. The media buttons and "MODO CAFÉ" toggle are wired to real
commands, not decoration.

## Install

```bash
cd nothing-rice
./install.sh
```

The script installs the desklets into `~/.local/share/cinnamon/desklets`,
offers to install the optional CLI tools the widgets read from
(`playerctl`, `nmcli`, `bluetoothctl`, `pactl`, `sensors`), and copies the
wallpaper into `~/Pictures`.

**Cinnamon doesn't auto-place new desklets** — after installing:

1. Right-click the desktop → **Add desklets**.
2. Find each "Nothing …" desklet in the list and click its **+**.
3. Drag them into position — top-right for the Island mirrors the original.

## Config

- **Weather city**: edit `CITY` at the top of
  `desklets/nothing-weather@itzcatto/desklet.js` (defaults to
  `Villupuram`, matching the original screenshot).
- **Cafe-mode toggle**: flips Cinnamon's notification setting
  (`org.cinnamon.desktop.notifications display-notifications`) — change
  `CAFE_GSETTINGS_KEY` in `nothing-island@itzcatto/desklet.js` if you'd
  rather it toggle something else.

## Finishing the look (not scriptable — needs your own taste/hardware)

- **Font**: install `fonts-jetbrains-mono` as a free stand-in for Nothing's
  proprietary "Ndot" dot-matrix font.
- **GTK/icon theme**: a dark theme (e.g. Orchis-Dark) + a matching dark icon
  set (e.g. Tela-dark) gets the rest of the UI chrome on-brand.
- **Dock**: the bottom icon dock in the screenshots is a dock, not a taskbar
  — Cinnamon's panel is a different metaphor. Install **Plank** and theme it
  dark/rounded for the same effect.
- **Wallpaper**: `assets/wallpaper.svg` (grain + red glow, installed to
  `~/Pictures/nothing-wallpaper.svg`) approximates the noisy dark-and-red
  background from the screenshots; swap in your own if you'd rather.
