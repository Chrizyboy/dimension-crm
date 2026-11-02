import type { Ansicht, KampagnenZahlen, SocialPost, Werbekampagne, Werbemittel } from '../types'

/** Ein Vorschlag auf der Übersicht: Schlüssel unter «werbung.vorschlag», Werte für den Text, Ziel-Reiter. */
export interface Vorschlag {
  schluessel: string
  werte: Record<string, string | number>
  ansicht: Ansicht
  ton: 'info' | 'warnung' | 'kritisch'
}

const TAG = 86_400_000
const tageBis = (iso: string, heute: Date) => Math.round((Date.parse(`${iso}T12:00:00Z`) - heute.getTime()) / TAG)

/**
 * Was ist heute im Marketing zu tun? Je nach Rechten der Person: Freigaben (Administration), Kosten zuordnen
 * (Finanzen), sonst für alle: Messe vorbereiten, Kampagne ohne Leads, Werbemittel nachbestellen, Posts «von Hand»
 * fällig, Saison-Thema ohne Post. Reihenfolge: dringend zuerst, höchstens `max`.
 */
export function vorschlaege(
  d: {
    admin: boolean
    finanzen: boolean
    posts: readonly SocialPost[]
    kampagnen: readonly Werbekampagne[]
    zahlen: readonly KampagnenZahlen[]
    werbemittel: readonly Werbemittel[]
    kostenOffen: number
    thema: string | null
  },
  heute = new Date(),
  max = 6,
): Vorschlag[] {
  const aus: Vorschlag[] = []
  const zurFreigabe = d.posts.filter((p) => p.status === 'zur_freigabe').length
  if (d.admin && zurFreigabe)
    aus.push({ schluessel: 'freigeben', werte: { anzahl: zurFreigabe }, ansicht: 'social', ton: 'warnung' })
  const vonHand = d.posts.filter(
    (p) => p.status === 'geplant' && p.details.von_hand && p.geplant_am && Date.parse(p.geplant_am) <= heute.getTime(),
  ).length
  if (vonHand) aus.push({ schluessel: 'vonHand', werte: { anzahl: vonHand }, ansicht: 'social', ton: 'kritisch' })
  const fehler = d.posts.filter((p) => p.status === 'fehler').length
  if (fehler) aus.push({ schluessel: 'postFehler', werte: { anzahl: fehler }, ansicht: 'social', ton: 'kritisch' })
  if (d.finanzen && d.kostenOffen)
    aus.push({ schluessel: 'kosten', werte: { anzahl: d.kostenOffen }, ansicht: 'uebersicht', ton: 'info' })

  for (const k of d.kampagnen) {
    if (k.art !== 'messe' || !k.start_am || k.status === 'abgeschlossen') continue
    const tage = tageBis(k.start_am, heute)
    const offen = (k.details.checkliste ?? []).filter((c) => !c.erledigt).length
    if (tage >= 0 && tage <= 30 && offen)
      aus.push({
        schluessel: 'messe',
        werte: { name: k.name, tage, offen },
        ansicht: 'messen',
        ton: tage <= 7 ? 'warnung' : 'info',
      })
    const ende = k.ende_am ?? k.start_am
    const nach = -tageBis(ende, heute)
    if (nach >= 1 && nach <= 7) aus.push({ schluessel: 'messeDanke', werte: { name: k.name }, ansicht: 'messen', ton: 'warnung' })
  }
  const zahl = new Map(d.zahlen.map((z) => [z.kampagne_id, z]))
  for (const k of d.kampagnen) {
    if (k.status !== 'laeuft' || !k.start_am || k.art === 'messe') continue
    if (-tageBis(k.start_am, heute) >= 21 && (zahl.get(k.id)?.leads ?? 0) === 0)
      aus.push({ schluessel: 'ohneLeads', werte: { name: k.name }, ansicht: 'kampagnen', ton: 'info' })
  }
  for (const w of d.werbemittel) {
    if (w.bestand !== null && w.mindestbestand !== null && w.bestand < w.mindestbestand)
      aus.push({ schluessel: 'nachbestellen', werte: { name: w.name, bestand: w.bestand }, ansicht: 'mediathek', ton: 'warnung' })
  }
  const monat = heute.toISOString().slice(0, 7)
  const postImMonat = d.posts.some((p) => (p.geplant_am ?? p.veroeffentlicht_am ?? '').startsWith(monat))
  if (d.thema && !postImMonat) aus.push({ schluessel: 'thema', werte: { thema: d.thema }, ansicht: 'social', ton: 'info' })

  const rang = { kritisch: 0, warnung: 1, info: 2 }
  return aus.sort((a, b) => rang[a.ton] - rang[b.ton]).slice(0, max)
}
