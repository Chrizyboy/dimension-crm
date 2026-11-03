// Bewertungsanfragen (Modul-Prüfung 32A): Der Zeitplan lässt die KI für fällige Anfragen einschätzen, ob der Kunde
// zufrieden ist (Mail-Verlauf, Notizen, Posteingang, Service-Fälle). Die KI schlägt nur vor; gesendet wird erst,
// wenn ein Mensch die einzelne Anfrage in Marketing › Empfehlungen freigibt. Ohne KI gilt «unklar».

import type { Teil } from './claude.ts'
import { dienst } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { daten, GRUNDREGELN, kiAufruf, kiEingerichtet, kiEinstellung, type KiEinstellung } from './ki_rahmen.ts'
import { kurz, objekt, text, wahl } from './ki_schema.ts'

interface Offen {
  id: string
  sprache: 'de' | 'fr'
  kontext: unknown
}

const SCHEMA = objekt({ einschaetzung: wahl(['zufrieden', 'unklar', 'unzufrieden']), grund: text })

/** Systemtext: intern, nüchtern, in der Sprache des Teams (Deutsch; Romandie Französisch). */
function system(sprache: 'de' | 'fr'): string {
  return `${GRUNDREGELN}
Du schätzt für das Team intern ein, ob ein Kunde nach dem Bau seiner Anlage zufrieden ist, bevor jemand ihn um eine Google-Bewertung bittet. Schreibe den Grund in ${sprache === 'fr' ? 'Französisch' : 'Deutsch'}.`
}

/** Aufgabe mit den Daten des Kunden. */
export function zufriedenheitTeile(kontext: unknown): Teil[] {
  return [
    { art: 'text', text: daten('kunde', kontext) },
    {
      art: 'text',
      text: `AUFGABE: Ist dieser Kunde zufrieden? «zufrieden» nur, wenn nichts auf Ärger hindeutet (keine offenen Reklamationen, keine verärgerten Mails, keine abgelehnten Nachträge, Service-Fälle erledigt). «unzufrieden», wenn es klare Zeichen gibt (Reklamation, Beschwerde, Streit über Rechnung oder Termin, offener Fall mit hoher Priorität). Sonst oder bei zu wenig Daten «unklar».
«grund»: ein bis zwei kurze Sätze mit dem wichtigsten Hinweis aus den Daten (Datum, wenn vorhanden). Keine Namen nennen.`,
    },
  ]
}

/** Arbeitet bis zu `limit` fällige Anfragen ab; Meldung für das Zeitplan-Protokoll. */
export async function bewertungenEinschaetzen(limit = 10): Promise<string> {
  const offen = await dienst.rpc<Offen[]>('bewertungen_offen', { p_limit: limit })
  if (!offen.length) return '0 Anfragen'
  let cfg: KiEinstellung | null = kiEingerichtet() ? await kiEinstellung() : null
  let ki = 0
  let regel = 0
  for (const b of offen) {
    let ergebnis: { einschaetzung: string; grund: string; ohne_ki?: boolean } | null = null
    if (cfg?.aktiv) {
      try {
        const r = await kiAufruf(
          { funktion: 'zufriedenheit', personId: null, bezugTabelle: 'bewertungsanfragen', bezugId: b.id },
          cfg,
          { system: system(b.sprache), teile: zufriedenheitTeile(b.kontext), schema: SCHEMA, maxTokens: 500 },
        )
        const j = r.json as { einschaetzung?: string; grund?: string }
        ergebnis = { einschaetzung: j.einschaetzung ?? 'unklar', grund: kurz(j.grund, 400) }
        ki++
      } catch (f) {
        // Limit erreicht oder KI aus: für den Rest dieses Laufs ohne KI.
        if (f instanceof DienstFehler && ['ki_limit', 'ki_aus', 'ki_modell'].includes(f.code)) cfg = null
      }
    }
    if (!ergebnis) {
      ergebnis = { einschaetzung: 'unklar', grund: '', ohne_ki: true }
      regel++
    }
    await dienst.rpc('bewertung_einschaetzen', { p_id: b.id, p: ergebnis })
  }
  return `${ki} mit KI, ${regel} ohne KI`
}
