"""Erzeugt alle App-Icons (Handy/PWA und Windows/Tauri) aus einer Zeichnung.

Das App-Symbol ist das gewählte Signet von «Dimension Work» (Entwurf 8, Chris
31.10./02.11.2026): oranges Achteck als Umriss mit oranger Sonne, wie
`public/logo/icon-umriss.svg`.

Warum ein eigenes Skript statt `tauri icon`:
- Handy (apple-touch-icon, Manifest): iOS füllt durchsichtige Stellen schwarz.
  Darum randlos dunkelblau (Farbe der App) mit dem Signet in der Mitte, in der
  sicheren Zone (maskable). iOS und Android runden selbst ab.
- Windows (Fenster, Taskleiste, Favicon): Signet auf durchsichtigem Grund. Für
  kleine Grössen ist der Umriss dicker und die Sonne einfacher, sonst verschwimmt
  der dünne Umriss (16 px Titelleiste).

Aufruf (aus dem Projektordner): python3 scripts/icons/icons_erzeugen.py
Braucht Pillow (pip install pillow).
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

ORANGE = (239, 124, 0, 255)  # #EF7C00, Farbe aus dem Logo
DUNKELBLAU = (2, 34, 79, 255)  # #02224F, theme_color der App
LEER = (0, 0, 0, 0)
UEBERABTASTUNG = 8  # gross zeichnen, dann verkleinern = glatte Kanten

WURZEL = Path(__file__).resolve().parents[2]
PUBLIC = WURZEL / "public"
TAURI = WURZEL / "src-tauri" / "icons"


def achteck(d):
    """Umriss aus icon-umriss.svg (Einheit 112), um d nach aussen versetzt."""
    s2 = d * math.sqrt(2)
    oben, rechts, unten, links = -d, 112 + d, 112 + d, -d
    tl = 26 - s2  # Gerade x + y = tl
    br = 196 + s2  # Gerade x + y = br
    return [
        (tl - oben, oben),
        (rechts, oben),
        (rechts, br - rechts),
        (br - unten, unten),
        (links, unten),
        (links, tl - links),
    ]


def signet(z, x0, y0, groesse, grund, klein=False, winzig=False):
    """Zeichnet das Signet in ein Quadrat (x0, y0, groesse) auf Grund `grund`.

    Die Zeichnung belegt die Einheiten -h..112+h, h = halbe Strichbreite.
    """
    h = 9 if klein else 4  # halbe Strichbreite (SVG: 8)
    k = groesse / (112 + 2 * h)

    def p(x, y):
        return (x0 + (x + h) * k, y0 + (y + h) * k)

    z.polygon([p(*e) for e in achteck(h)], fill=ORANGE)
    z.polygon([p(*e) for e in achteck(-h)], fill=grund)

    def kreis(cx, cy, r, farbe):
        mx, my = p(cx, cy)
        z.ellipse((mx - r * k, my - r * k, mx + r * k, my + r * k), fill=farbe)

    if winzig:
        # 16-20 px: nur Ring und 4 Punkte, mehr lässt sich nicht unterscheiden.
        punkte, ring_r, ring_s, strahlen = [(33, 9)], 13, 11, 4
    elif klein:
        # Ring und 8 Punkte, kräftig, damit es mit 24/32 px noch eine Sonne ist.
        punkte, ring_r, ring_s, strahlen = [(25, 7.5)], 10.5, 8, 8
    else:
        punkte, ring_r, ring_s, strahlen = [(22.6, 7), (37.6, 5.2)], 10, 6, 8
    for i in range(strahlen):
        w = math.radians(-90 + i * 360 / strahlen)
        for abstand, r in punkte:
            kreis(56 + abstand * math.cos(w), 56 + abstand * math.sin(w), r, ORANGE)
    kreis(56, 56, ring_r + ring_s / 2, ORANGE)
    kreis(56, 56, ring_r - ring_s / 2, grund)


def zeichne(groesse, grund, anteil, klein=False):
    """Ein Icon in Pixelgrösse `groesse`, Signet mit Anteil `anteil` der Fläche."""
    g = groesse * UEBERABTASTUNG
    bild = Image.new("RGBA", (g, g), grund)
    s = g * anteil
    signet(ImageDraw.Draw(bild), (g - s) / 2, (g - s) / 2, s, grund, klein, winzig=groesse <= 20)
    return bild.resize((groesse, groesse), Image.LANCZOS)


def handy(groesse):
    # 60 % passt in die sichere Zone von Android (Kreis mit 80 % Durchmesser).
    return zeichne(groesse, DUNKELBLAU, 0.60).convert("RGB")


def windows(groesse):
    return zeichne(groesse, LEER, 1.0 if groesse <= 32 else 0.94, klein=groesse <= 32)


def main():
    # Handy / PWA
    handy(180).save(PUBLIC / "apple-touch-icon.png")
    handy(192).save(PUBLIC / "icon-192.png")
    handy(512).save(PUBLIC / "icon-512.png")
    handy(512).save(PUBLIC / "icon-maskable-512.png")

    # Windows / Tauri
    for name, groesse in {
        "32x32.png": 32,
        "64x64.png": 64,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
        "Square30x30Logo.png": 30,
        "Square44x44Logo.png": 44,
        "Square71x71Logo.png": 71,
        "Square89x89Logo.png": 89,
        "Square107x107Logo.png": 107,
        "Square142x142Logo.png": 142,
        "Square150x150Logo.png": 150,
        "Square284x284Logo.png": 284,
        "Square310x310Logo.png": 310,
        "StoreLogo.png": 50,
    }.items():
        windows(groesse).save(TAURI / name)

    # .ico: jede Grösse einzeln gezeichnet (nicht nur verkleinert).
    groessen = [16, 20, 24, 32, 40, 48, 64, 128, 256]
    bilder = [windows(g) for g in groessen]
    bilder[-1].save(TAURI / "icon.ico", sizes=[(g, g) for g in groessen], append_images=bilder[:-1])

    # macOS (Tauri verlangt die Datei)
    windows(1024).save(TAURI / "icon.icns")


if __name__ == "__main__":
    main()
