// Aktion «eingangsrechnung» der Edge Function «ki» (Chris 27.11.2026): liest eine Lieferantenrechnung (PDF oder
// Foto) und schlägt die Felder vor. Gespeichert wird erst in der App mit «Speichern» (eingang_hochladen).

import { dienst, type Ich } from '../_shared/datenbank.ts'
import { EINGANG_SCHEMA, eingangPruefen, eingangTeile, SYSTEM_EINGANG } from '../_shared/ki_eingang.ts'
import { kiAufruf, kiEinstellung } from '../_shared/ki_rahmen.ts'
import { dateiFeld, heute } from './hilfe.ts'

/** Rechnung lesen; die eigenen Firmennamen helfen, Rechnungssteller und Empfänger zu trennen. */
export async function eingangsrechnung(e: Record<string, unknown>, ich: Ich) {
  const datei = dateiFeld(e)
  const firmen = (await dienst.lies<{ name: string }[]>('firmen?geloescht_am=is.null&select=name')).map((f) => f.name)
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'eingangsrechnung', personId: ich.id }, cfg, {
    system: SYSTEM_EINGANG,
    teile: eingangTeile(datei, firmen.length ? firmen : ['Dimension Solaire'], heute()),
    schema: EINGANG_SCHEMA,
    maxTokens: 1500,
  })
  return eingangPruefen(r.json as Record<string, unknown>)
}
