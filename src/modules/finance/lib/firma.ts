import type { Finanzdaten } from '../types'

/**
 * Finanzdaten einer Gesellschaft (Muri GmbH oder Bulle Sàrl). `null` = beide zusammen. Posten ohne Gesellschaft
 * zählen nur bei «beide», damit nichts doppelt oder falsch zugeordnet erscheint; der Monatsabschluss meldet sie.
 */
export function fuerFirma(d: Finanzdaten, firmaId: string | null): Finanzdaten {
  if (!firmaId) return d
  const passt = (f: string | null | undefined) => f === firmaId
  return {
    ...d,
    zahlungen: d.zahlungen.filter((z) => passt(z.firma_id)),
    material: d.material.filter((m) => passt(m.firma_id)),
    fixkosten: d.fixkosten.filter((f) => passt(f.firma_id)),
    eingaenge: d.eingaenge.filter((e) => passt(e.firma_id)),
    rechnungen: d.rechnungen.filter((r) => passt(r.firma_id)),
    tranchen: d.tranchen.filter((t) => passt(t.projekt_id ? d.projektFirma[t.projekt_id] : null)),
    konten: d.konten.filter((k) => passt(k.firma_id)),
    mwst: d.mwst.filter((m) => passt(m.firma_id)),
    zahllaeufe: d.zahllaeufe.filter((z) => passt(z.firma_id)),
    // Kundenzahlungen tragen keine Gesellschaft; mit Konten zählt ohnehin der Stand des Kontos.
    kundenzahlungen: [],
  }
}

/** Reserve einer Gesellschaft oder beider zusammen (Einstellung je Gesellschaft, sonst die alte gemeinsame). */
export function reserveFuer(d: Finanzdaten, firmaId: string | null): number {
  const je = d.einstellungen.reserve_je_firma ?? {}
  if (firmaId) return je[firmaId] ?? 0
  const summe = Object.values(je).reduce((s, v) => s + v, 0)
  return summe || (d.einstellungen.reserve_rappen ?? 0)
}
