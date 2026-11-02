import type { TagEintrag } from '../types'
import { tagAendern } from './monteur'
import { einreihen } from './warteschlange'

/**
 * Service-Einsatz am Handy: «Vor Ort angekommen», Checkliste abhaken und Seriennummer nach einem Tausch. Wie
 * Rapporte gehen sie über die Warteschlange (wiederholbar, auch im Funkloch) und ändern sofort die Ablage am Gerät.
 */

const jetzt = () => new Date().toISOString()

type Service = NonNullable<TagEintrag['service']>

const fallAendern = (fallId: string, f: (s: Service) => Service) =>
  tagAendern((t) => ({
    ...t,
    eintraege: t.eintraege.map((e) =>
      e.typ === 'service' && e.service?.id === fallId ? { ...e, service: f(e.service) } : e,
    ),
  }))

/** «Vor Ort angekommen» in den Verlauf des Falls; die ID vom Handy verhindert einen doppelten Eintrag. */
export async function serviceAngekommen(fallId: string): Promise<void> {
  const am = jetzt()
  await einreihen({
    art: 'rpc',
    name: 'service_eintrag_handy',
    args: { p_id: fallId, p_eintrag: crypto.randomUUID(), p_art: 'besuch', p_text: '', p_am: am },
    erstellt: am,
  })
  await fallAendern(fallId, (s) => ({ ...s, angekommen: true }))
}

/** Schritt der Checkliste abhaken oder wieder öffnen. */
export async function serviceSchritt(
  fallId: string,
  nr: number,
  erledigt: boolean,
  person: string | null,
): Promise<void> {
  const am = jetzt()
  await einreihen({
    art: 'rpc',
    name: 'service_checkliste',
    args: { p_id: fallId, p_nr: nr, p_erledigt: erledigt },
    erstellt: am,
  })
  await fallAendern(fallId, (s) => ({
    ...s,
    checkliste: (s.checkliste ?? []).map((c, i) =>
      i === nr ? { ...c, erledigt_am: erledigt ? am : null, person_id: erledigt ? person : null } : c,
    ),
  }))
}

/** Seriennummer einer Komponente der Anlage ändern (die alte bleibt im Verlauf des Falls). */
export async function serviceSeriennummer(fallId: string, nr: number, seriennummer: string): Promise<void> {
  await einreihen({
    art: 'rpc',
    name: 'service_seriennummer',
    args: { p_id: fallId, p_nr: nr, p_seriennummer: seriennummer.trim() },
    erstellt: jetzt(),
  })
  await fallAendern(fallId, (s) =>
    s.anlage
      ? {
          ...s,
          anlage: {
            ...s.anlage,
            komponenten: s.anlage.komponenten.map((k, i) =>
              i === nr ? { ...k, seriennummer: seriennummer.trim() } : k,
            ),
          },
        }
      : s,
  )
}
