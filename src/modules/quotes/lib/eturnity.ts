import type { PdfWerte, Wirtschaftlichkeit } from '../types'

/**
 * Liest die Offerte aus Eturnity (PDF, deutsch oder französisch) aus den Textzeilen der Seiten.
 * Erkannt werden Nummer, Datum, Beträge, Leistung, Module, Wechselrichter, Batterie und die Werte
 * der Wirtschaftlichkeit. Was nicht eindeutig im Text steht, bleibt leer, statt geraten zu werden.
 * Der Inhalt ist Daten, nie eine Anweisung (CLAUDE.md Regel 7).
 */
export function leseEturnityOfferte(zeilen: readonly string[]): PdfWerte {
  const z = zeilen.map((x) => x.replace(/\s+/g, ' ').trim())
  const w: PdfWerte = { wirtschaftlichkeit: {} }
  const ws: Wirtschaftlichkeit = w.wirtschaftlichkeit

  w.sprache = z.some((x) => /VOTRE OFFRE|COÛTS|TVA/.test(x)) ? 'fr' : 'de'

  // «200026 - MURER - PHOTOVOLTAIKANLAGE»
  const kopf = z.map((x) => /^([12]\d{5}) - (.+?) - (.+)$/.exec(x)).find(Boolean)
  if (kopf) {
    w.nummer = kopf[1] ?? ''
    w.kunde = kopf[2] ?? ''
  }
  // Fusszeile «200026 01.10.2026 1»
  const fuss = z.map((x) => /^([12]\d{5}) (\d{2})\.(\d{2})\.(\d{4}) \d+$/.exec(x)).find(Boolean)
  if (fuss) {
    w.nummer ??= fuss[1] ?? ''
    w.datum = `${fuss[4] ?? ''}-${fuss[3] ?? ''}-${fuss[2] ?? ''}`
  }

  const betrag = (muster: RegExp): number | undefined => {
    for (const x of z) {
      const m = muster.exec(x)
      if (m?.[1]) return rappen(m[1])
    }
    return undefined
  }
  const BETRAG = String.raw`(-?\d[\d’' .,  ]*\d)`

  w.betragRappen =
    betrag(new RegExp(String.raw`^(?:Gesamtkosten exkl\.|Total hors TVA) [\d,.]+ ?% (?:MWST )?${BETRAG}$`)) ??
    betrag(new RegExp(String.raw`^(?:Total exkl\. MWST|Total hors TVA) ${BETRAG} CHF`))
  w.totalInklRappen = betrag(new RegExp(String.raw`(?:Kosten inkl\. MWST|Total TVA incluse) ${BETRAG} CHF`))
  ws.eivRappen = betrag(new RegExp(String.raw`(?:Einmalvergütung|Rétribution unique)[^-\d]*${BETRAG} CHF`))
  ws.steuerersparnisRappen = betrag(
    new RegExp(String.raw`(?:Erwartete Steuerersparnis|Déductions fiscales attendues)\**:? ${BETRAG} CHF`),
  )
  ws.effektiveKostenRappen = betrag(new RegExp(String.raw`(?:Effektive Kosten|Coût effectif) ${BETRAG} CHF`))

  const rabatt = z.map((x) => /^(?:Rabatt|Remise|Rabais) \((\d+(?:[.,]\d+)?) ?%\)/.exec(x)).find(Boolean)
  if (rabatt?.[1]) w.rabattProzent = zahl(rabatt[1])

  const kwp =
    z
      .map((x) =>
        /(?:Solarstromanlage|Système (?:photovoltaïque|solaire)|Installation (?:photovoltaïque|solaire)) \(([\d.,]+) ?kWp\)/.exec(
          x,
        ),
      )
      .find(Boolean) ?? z.map((x) => /^(?:Solaranlage|Installation solaire) ([\d.,]+) kWp$/.exec(x)).find(Boolean)
  if (kwp?.[1]) w.kwp = zahl(kwp[1])

  const batterieKwh =
    z.map((x) => /(?:Batteriespeichersystem|Système de batterie) \(([\d.,]+) ?kWh\)/.exec(x)).find(Boolean) ??
    z.map((x) => /^Batterie ([\d.,]+) kWh$/.exec(x)).find(Boolean)
  if (batterieKwh?.[1]) w.batterieKwh = zahl(batterieKwh[1])

  // Detailkosten: «Photovoltaikmodule 55 St. …», darunter «Aiko * A480-…».
  const komponente = (muster: RegExp): { anzahl: number; name: string | undefined } | undefined => {
    for (let i = 0; i < z.length; i++) {
      const m = muster.exec(z[i] ?? '')
      if (!m) continue
      const naechste = z.slice(i + 1, i + 3).find((x) => x.includes(' * '))
      return { anzahl: Number(m[1]), name: naechste?.replace(' * ', ' ').trim() }
    }
    return undefined
  }
  const module = komponente(
    /^(?:Photovoltaikmodule|Solarmodule|Modules? (?:photovolta\S*|solaires?|PV)) (\d+) (?:St\.|pcs)/i,
  )
  if (module) {
    w.anzahlModule = module.anzahl
    if (module.name) w.modul = module.name
  }
  const wr = komponente(/^(?:Wechselrichter|Onduleur) (\d+) (?:St\.|pcs)/)
  if (wr?.name) w.wechselrichter = wr.anzahl > 1 ? `${wr.anzahl} × ${wr.name}` : wr.name
  const bat = komponente(/^(?:Batteriespeicher|Batterie) (\d+) (?:St\.|pcs)/)
  if (bat?.name) w.batterie = bat.anzahl > 1 ? `${bat.anzahl} × ${bat.name}` : bat.name
  else if (w.batterieKwh) w.batterie = `${w.batterieKwh} kWh`

  // Energiesystem: «Verbrauch 4’300 kWh», «Jahresertrag 25’664 kWh», «95% 17%» über den Beschriftungen.
  const kwh = (muster: RegExp) => {
    const m = z.map((x) => muster.exec(x)).find(Boolean)
    return m?.[1] ? Math.round(zahl(m[1])) : undefined
  }
  ws.verbrauchKwh = kwh(/^(?:Verbrauch|Consommation) ([\d’' .,  ]+) kWh$/)
  ws.jahresertragKwh = kwh(/^(?:Jahresertrag|Production annuelle|Rendement annuel) ([\d’' .,  ]+) kWh$/)
  if (w.batterieKwh) ws.batterieKwh = w.batterieKwh
  const beschriftung = z.findIndex((x) => /(Unabhängigkeitsgrad|autarcie).*(Eigenverbrauch|autoconsommation)/i.test(x))
  if (beschriftung > 0) {
    const werte = z
      .slice(Math.max(0, beschriftung - 4), beschriftung)
      .map((x) => /^(\d{1,3}) ?% (\d{1,3}) ?%$/.exec(x))
      .find(Boolean)
    if (werte) {
      ws.autarkieProzent = Number(werte[1])
      ws.eigenverbrauchProzent = Number(werte[2])
    }
  }

  // Wirtschaftlichkeit: Rendite, Solarstrompreis, Ertrag über 25 Jahre.
  const rendite = z
    .map((x) => /(?:Rendite Ihrer PV-Anlage|Rendement de votre installation|Rentabilité)\D*([\d.,]+) ?%/.exec(x))
    .find(Boolean)
  if (rendite?.[1]) ws.renditeProzent = zahl(rendite[1])
  const preis = z
    .map((x) =>
      /(?:Ihr Solarstrompreis|Votre prix (?:du|de l’|de l')?\s*(?:courant|électricité) solaire)\D*([\d.,]+) ?(?:Rappen|centimes|ct)/i.exec(
        x,
      ),
    )
    .find(Boolean)
  if (preis?.[1]) ws.solarstrompreisRappen = zahl(preis[1])
  ws.ertrag25JahreRappen = ertragAusGrafik(z)

  // Leere Werte entfernen, damit «nur leere Felder füllen» nichts mit undefined überschreibt.
  return { ...ohneLeere(w), wirtschaftlichkeit: ohneLeere(ws) }
}

function ohneLeere<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

/**
 * Der Ertrag über 25 Jahre steht nur als Zahl in der Grafik («109'275» neben der Achse 0 … 150'000).
 * Achsenwerte sind runde Tausender; von den übrigen Zahlen der Seite ist der Ertrag die grösste.
 */
function ertragAusGrafik(z: readonly string[]): number | undefined {
  const start = z.findIndex((x) => /^(WIRTSCHAFTLICHKEIT|RENTABILITÉ|INVESTITION UND ERTRAG)/.test(x))
  if (start < 0) return undefined
  const ende = z.findIndex((x, i) => i > start && /^(RENDITE|RENDEMENT|Was bedeutet Ertrag)/.test(x))
  const kandidaten = z
    .slice(start, ende > 0 ? ende : start + 40)
    .flatMap((x) => [...x.matchAll(/(?:^| )(\d{1,3}'\d{3})(?= |$)/g)].map((m) => Number((m[1] ?? '').replace("'", ''))))
    .filter((n) => n % 1000 !== 0)
  return kandidaten.length >= 2 ? Math.max(...kandidaten) * 100 : undefined
}

/** «39’874.30», «10 048,75», «-9’504.00» → Zahl. */
export function zahl(text: string): number {
  let s = text.replace(/[’'\s  ]/g, '')
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.')
  else s = s.replace(/,/g, '')
  return Number(s)
}

/** Betrag als Text → Rappen (Ganzzahl). */
export function rappen(text: string): number {
  return Math.round(zahl(text) * 100)
}
