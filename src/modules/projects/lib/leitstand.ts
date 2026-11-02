import { blockerVon, LIEFERFRIST_STANDARD } from './blocker'
import { PHASEN, type Hinweis, type Phase, type Projekt, type Schnellfilter, type Signale } from '../types'

/** Tage zwischen zwei Daten (ISO), positiv wenn `bis` später ist. */
export function tageBis(von: string, bis: string): number {
  return Math.round((Date.parse(bis) - Date.parse(von)) / 86_400_000)
}

/** Heute als ISO-Datum in Schweizer Zeit. */
export function heuteIso(jetzt = new Date()): string {
  return jetzt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}

/**
 * Phase, in der ein Projekt gerade steht: die erste Phase des Fahrplans, die noch offene Schritte hat.
 * Ohne Fahrplan (alte Projekte) zählt der Baustellen-Status, damit jedes Projekt eine Spalte hat.
 */
export function aktuellePhase(p: Projekt): Phase {
  const offen = p.stand?.phasen.find((x) => x.gesamt > 0 && x.erledigt < x.gesamt)
  if (offen) return offen.phase
  if (p.stand) return 'abschluss'
  if (p.status === 'auftrag') return 'auftrag'
  if (p.status === 'abgeschlossen' || p.bau_status === 'fertig') return 'abschluss'
  if (p.bau_status === 'ibn') return 'ibn'
  return 'vorb'
}

/** Braucht das Projekt einen Bautermin? Auftrag ohne Bau oder Baustelle ohne Datum. */
export const ohneTermin = (p: Projekt) => p.status !== 'abgeschlossen' && !p.baubeginn

/** Fehlt Material für einen Einsatz in den nächsten 14 Tagen? */
export function materialKnapp(p: Projekt, s: Signale | undefined, heute: string): boolean {
  if (!s || s.material_fehlt === 0) return false
  const bau = s.naechster_einsatz ?? p.baubeginn
  return bau != null && tageBis(heute, bau) <= 14
}

/**
 * Hinweise für eine Karte, wichtigste zuerst: was blockiert (Material vor dem Bau, überfällige Bewilligung),
 * was zu tun ist (Bautermin, Rechnung stellen) und was gut läuft (Material komplett).
 */
export function hinweise(
  p: Projekt,
  s: Signale | undefined,
  heute: string,
  lieferfrist = LIEFERFRIST_STANDARD,
): Hinweis[] {
  const h: Hinweis[] = []
  // Gleiche Blocker wie Automationen und Glocke (lib/blocker.ts), damit Karte und Meldung übereinstimmen.
  const b = blockerVon(p, lieferfrist, new Date(`${heute}T12:00:00`))
  if (materialKnapp(p, s, heute) && s)
    h.push({ schluessel: 'material_fehlt', ton: 'kritisch', werte: { anzahl: s.material_fehlt } })
  else if (b.includes('material')) h.push({ schluessel: 'material_bestellen', ton: 'kritisch' })
  if (p.stand && p.stand.bewilligungen_spaet > 0)
    h.push({ schluessel: 'bewilligung_spaet', ton: 'kritisch', werte: { anzahl: p.stand.bewilligungen_spaet } })
  if (b.includes('frist')) h.push({ schluessel: 'frist', ton: 'kritisch' })
  if (s && s.offen_rappen > 0 && s.offen_faellig_am && s.offen_faellig_am < heute)
    h.push({ schluessel: 'zahlung_ueberfaellig', ton: 'kritisch', werte: { tage: tageBis(s.offen_faellig_am, heute) } })
  if (ohneTermin(p)) h.push({ schluessel: 'ohne_termin', ton: 'warnung' })
  if (s && s.tranchen_faellig_rappen > 0) h.push({ schluessel: 'verrechnen', ton: 'warnung' })
  if (s && s.nachtraege_offen > 0)
    h.push({ schluessel: 'nachtraege', ton: 'info', werte: { anzahl: s.nachtraege_offen } })
  if (s && s.material_positionen > 0 && s.material_fehlt === 0) h.push({ schluessel: 'material_ok', ton: 'ok' })
  return h
}

/** Ist das Projekt blockiert (mindestens ein kritischer Hinweis)? */
export const blockiert = (p: Projekt, s: Signale | undefined, heute: string, lieferfrist = LIEFERFRIST_STANDARD) =>
  hinweise(p, s, heute, lieferfrist).some((x) => x.ton === 'kritisch')

/** Trifft ein Schnellfilter auf ein Projekt zu? */
export function trifft(
  p: Projekt,
  s: Signale | undefined,
  f: Schnellfilter,
  ich: string | null,
  heute: string,
  lieferfrist = LIEFERFRIST_STANDARD,
): boolean {
  switch (f) {
    case 'meine':
      return ich != null && p.verantwortlich_id === ich
    case 'spaet':
      return Boolean(p.stand?.spaet) || blockiert(p, s, heute, lieferfrist)
    case 'bewilligung':
      return (p.stand?.bewilligungen_spaet ?? 0) > 0
    case 'material':
      return (
        materialKnapp(p, s, heute) || blockerVon(p, lieferfrist, new Date(`${heute}T12:00:00`)).includes('material')
      )
    case 'ohne_termin':
      return ohneTermin(p)
    case 'verrechnen':
      return (s?.tranchen_faellig_rappen ?? 0) > 0
  }
}

/** Gehört ein abgeschlossenes Projekt noch in den Leitstand? Nur, wenn im letzten halben Jahr gebaut und noch etwas offen. */
export function nochOffen(p: Projekt, heute: string): boolean {
  if (p.status !== 'abgeschlossen') return true
  const datum = p.baubeginn ?? p.unterzeichnet_am
  if (!datum || tageBis(datum, heute) > 183) return false
  return Boolean(p.stand && p.stand.erledigt < p.stand.gesamt)
}

/** Projekte nach Phase für das Board, in jeder Spalte das Dringendste oben, dann nach Baubeginn. */
export function nachPhase(
  projekte: Projekt[],
  signale: Map<string, Signale>,
  heute: string,
  lieferfrist = LIEFERFRIST_STANDARD,
): Record<Phase, Projekt[]> {
  const leer = Object.fromEntries(PHASEN.map((x) => [x, [] as Projekt[]])) as Record<Phase, Projekt[]>
  const gewicht = (p: Projekt) => {
    const h = hinweise(p, signale.get(p.id), heute, lieferfrist)
    return h.some((x) => x.ton === 'kritisch') ? 0 : h.some((x) => x.ton === 'warnung') ? 1 : 2
  }
  for (const p of projekte) leer[aktuellePhase(p)].push(p)
  for (const x of PHASEN)
    leer[x].sort((a, b) => gewicht(a) - gewicht(b) || (a.baubeginn ?? '9999').localeCompare(b.baubeginn ?? '9999'))
  return leer
}

/** Montag und Sonntag der Woche eines Datums (ISO). */
export function woche(heute: string): { von: string; bis: string } {
  const d = new Date(`${heute}T12:00:00Z`)
  const tag = (d.getUTCDay() + 6) % 7
  const mo = new Date(d.getTime() - tag * 86_400_000)
  const so = new Date(mo.getTime() + 6 * 86_400_000)
  return { von: mo.toISOString().slice(0, 10), bis: so.toISOString().slice(0, 10) }
}
