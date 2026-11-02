"""Erzeugt alle App-Icons (Handy/PWA und Windows/Tauri) aus einer Zeichnung.

Warum ein eigenes Skript statt `tauri icon`: Das Logo von Dimension Solaire hat
schräg abgeschnittene Ecken. Als App-Icon füllt iOS diese durchsichtigen Ecken
schwarz, und Windows zeigt die Kanten unruhig. Darum hier:

- Handy (apple-touch-icon, Manifest): ganzes Quadrat orange, ohne Transparenz.
  iOS und Android runden selbst ab. Die Sonne liegt in der sicheren Zone (maskable).
- Windows (Taskleiste, Titelleiste, Startmenü): abgerundetes Quadrat wie andere
  Windows-Apps. Für 16/20/24 px eine vereinfachte Sonne, sonst wird sie zu Brei.

Aufruf (aus dem Projektordner): python3 scripts/icons/icons_erzeugen.py
Braucht Pillow (pip install pillow).
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

ORANGE = (239, 124, 0, 255)  # #EF7C00, Farbe aus dem Logo
WEISS = (255, 255, 255, 255)
UEBERABTASTUNG = 8  # gross zeichnen, dann verkleinern = glatte Kanten

WURZEL = Path(__file__).resolve().parents[2]
PUBLIC = WURZEL / "public"
TAURI = WURZEL / "src-tauri" / "icons"


def sonne(zeichnen, mitte, durchmesser, einfach=False):
    """Zeichnet die Sonne (Ring, 8 grosse und 8 kleine Punkte) wie in icon.svg.

    Masse aus icon.svg (Einheit 112): Ring r=10 Strich 6, innere Punkte r=7 im
    Abstand 22.6, äussere r=5.2 im Abstand 37.6. Äusserster Rand 42.8.
    """
    k = durchmesser / 2 / 42.8
    cx, cy = mitte
    if einfach:
        # Kleine Grössen: nur Ring und 8 Punkte, etwas kräftiger.
        k = durchmesser / 2 / 30.5
        ring_r, ring_s, punkt_r, abstand = 9.5 * k, 7 * k, 6.5 * k, 24 * k
        punkte = [(abstand, punkt_r)]
    else:
        ring_r, ring_s = 10 * k, 6 * k
        punkte = [(22.6 * k, 7 * k), (37.6 * k, 5.2 * k)]
    for i in range(8):
        winkel = math.radians(-90 + i * 45)
        for abstand, r in punkte:
            x = cx + abstand * math.cos(winkel)
            y = cy + abstand * math.sin(winkel)
            zeichnen.ellipse((x - r, y - r, x + r, y + r), fill=WEISS)
    aussen = ring_r + ring_s / 2
    innen = ring_r - ring_s / 2
    zeichnen.ellipse((cx - aussen, cy - aussen, cx + aussen, cy + aussen), fill=WEISS)
    zeichnen.ellipse((cx - innen, cy - innen, cx + innen, cy + innen), fill=ORANGE)


def icon(groesse, form, sonne_anteil, einfach=False):
    """Ein Icon: form 'quadrat' (randlos, Handy) oder 'rund' (Windows)."""
    g = groesse * UEBERABTASTUNG
    bild = Image.new("RGBA", (g, g), (0, 0, 0, 0))
    z = ImageDraw.Draw(bild)
    if form == "quadrat":
        z.rectangle((0, 0, g, g), fill=ORANGE)
    else:
        rand = round(g * 0.03)
        z.rounded_rectangle((rand, rand, g - rand - 1, g - rand - 1), radius=g * 0.22, fill=ORANGE)
    sonne(z, (g / 2, g / 2), g * sonne_anteil, einfach)
    bild = bild.resize((groesse, groesse), Image.LANCZOS)
    if form == "quadrat":
        bild = bild.convert("RGB")  # keine Transparenz, sonst füllt iOS schwarz
    return bild


def handy(groesse):
    # 68 % passt noch in die sichere Zone von Android (Kreis mit 80 % Durchmesser).
    return icon(groesse, "quadrat", 0.68)


def windows(groesse):
    if groesse <= 24:
        return icon(groesse, "rund", 0.78, einfach=True)
    if groesse <= 48:
        return icon(groesse, "rund", 0.80)
    return icon(groesse, "rund", 0.74)


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

    # macOS (der Vollständigkeit halber, Tauri verlangt die Datei)
    windows(1024).save(TAURI / "icon.icns")


if __name__ == "__main__":
    main()
