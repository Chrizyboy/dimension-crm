/** Eine PLZ-Regel einer Region, gleiches Format wie die Standort-Regeln in der Datenbank. */
export interface PlzRegel {
  plz_von?: number
  plz_bis?: number
  kantone?: string[]
}

/**
 * Liest Regeln aus einer Zeile wie «5600-5649, 6300, ZG»: Bereiche, einzelne PLZ und Kantone (zwei Buchstaben).
 * Gibt `null` zurück, wenn ein Teil nicht verstanden wird, damit nichts Falsches gespeichert wird.
 */
export function regelnLesen(text: string): PlzRegel[] | null {
  const teile = text
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
  const regeln: PlzRegel[] = []
  for (const teil of teile) {
    const bereich = /^(\d{4})\s*[-–]\s*(\d{4})$/.exec(teil)
    if (bereich) {
      const von = Number(bereich[1])
      const bis = Number(bereich[2])
      if (von > bis) return null
      regeln.push({ plz_von: von, plz_bis: bis })
    } else if (/^\d{4}$/.test(teil)) {
      regeln.push({ plz_von: Number(teil), plz_bis: Number(teil) })
    } else if (/^[a-z]{2}$/i.test(teil)) {
      regeln.push({ kantone: [teil.toUpperCase()] })
    } else {
      return null
    }
  }
  return regeln
}

/** Schreibt Regeln als Zeile («5600–5649, ZG»), zum Bearbeiten und Anzeigen. */
export function regelnText(regeln: unknown): string {
  if (!Array.isArray(regeln)) return ''
  return (regeln as PlzRegel[])
    .map((r) => {
      const plz =
        r.plz_von !== undefined && r.plz_bis !== undefined
          ? r.plz_von === r.plz_bis
            ? String(r.plz_von)
            : `${r.plz_von}-${r.plz_bis}`
          : ''
      const kantone = (r.kantone ?? []).join(' ')
      return [kantone, plz].filter(Boolean).join(' ')
    })
    .filter(Boolean)
    .join(', ')
}
