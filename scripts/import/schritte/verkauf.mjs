// Schritt 4: Verkaufschancen (leads, auch aus dem Papierkorb) und Zeitachse (activities).

import { text, zuDatum, zuGanzzahl, zuJaNein, zuOrtszeit, zuZeitstempel } from '../umwandeln.mjs'
import { alleLeads, objektVon } from './kunden.mjs'
import { leadStandort } from '../v233.mjs'
import { festeQuelle, istMesseOhneWunsch } from '../entscheide.mjs'

/** @typedef {import('../import-vorlage.mjs').Kontext} Kontext */

/**
 * Tour «6 – Luzern / Entlebuch» → Region 6.
 * @param {Kontext} k
 * @param {unknown} tour
 */
function region(k, tour) {
  const nr = Number(/^(\d+)/.exec(text(tour) ?? '')?.[1])
  return k.ids.regionen.get(nr) ?? null
}

/**
 * @param {Kontext} k
 */
export async function importiereVerkauf(k) {
  // Messe-Teilnahmen ohne Beratungswunsch bleiben Kontakte (Entscheid 13/15B), siehe kunden.mjs.
  // Im Zählbericht gelten sie als übernommen (als Kontakt).
  const leads = []
  /** @type {string[]} */
  const nurKontakt = []
  for (const x of alleLeads(k)) {
    if (!istMesseOhneWunsch(x.lead)) leads.push(x)
    else {
      nurKontakt.push(`lead:${x.nummer}`)
      const kontakt = k.ids.kontakte.get(Number(x.lead.kundenNr))
      if (kontakt) k.schreiber.merke(x.sammlung, x.schluessel, 'kontakte', kontakt)
    }
  }
  // Ein früherer Import (Probe-Import) hatte sie als Lead angelegt: in den Papierkorb, nie hart löschen.
  if (nurKontakt.length) {
    const { error } = await k.db
      .from('verkaufschancen')
      .update({ geloescht_am: new Date().toISOString() })
      .in('alt_id', nurKontakt)
      .is('geloescht_am', null)
    if (error) throw new Error(`verkaufschancen (Messe ohne Wunsch): ${error.message}`)
    k.hinweis(`${nurKontakt.length} Messe-Teilnahmen ohne Beratungswunsch nur als Kontakt übernommen (kein Lead).`)
  }
  const zeilen = leads.map(({ nummer, lead: l, geloescht_am, sammlung, schluessel }) => {
    const outlook = Object.fromEntries(Object.entries(l).filter(([f]) => f.startsWith('ol')))
    const bestaetigt = Object.fromEntries(Object.entries(l).filter(([f]) => f.startsWith('confirmed')))
    return {
      sammlung,
      schluessel,
      zeile: {
        alt_id: `lead:${nummer}`,
        nummer,
        kontakt_id: k.ids.kontakte.get(Number(l.kundenNr)),
        objekt_id: objektVon(k, l),
        stufe: k.zuordner.streng('verkaufsstufe', l.status, `${sammlung}/${schluessel}`, 'offen'),
        quelle: festeQuelle(l) ?? k.zuordner.locker('quelle', l.src),
        eingang_am: zuDatum(l.rec) ?? zuDatum(l.createdAt),
        zustaendig: text(l.zu),
        erstkontakt_standort: text(l.erst),
        // Wie V233 leadStandort; die Datenbank-Regel (zuständig, sonst Erstkontakt) wiche bei «Andy» ab.
        standort_id: k.ids.standorte.get(leadStandort(l).toLowerCase()) ?? null,
        zugewiesen_von: text(l.zuvon),
        region_id: region(k, l.tour),
        tour_person_id: k.person(l.tourPerson),
        termin_am: zuOrtszeit(l.tDate, l.tTime),
        termin_dauer_min: zuGanzzahl(l.tDur),
        termin_bestaetigt: Object.values(bestaetigt).some((v) => text(v)) ? bestaetigt : null,
        outlook: Object.values(outlook).some((v) => v !== null && v !== false && v !== '') ? outlook : null,
        wiedervorlage_am: zuDatum(l.wvDatum),
        wiedervorlage_grund: text(l.wvGrund),
        verlustgrund: text(l.keinGrund),
        finanzierung: k.zuordner.locker('finanzierung', l.fin),
        zeithorizont: k.zuordner.locker('zeithorizont', l.zeit),
        foerderung: k.zuordner.locker('foerderung', l.foerd),
        erreichbarkeit: k.zuordner.locker('erreichbarkeit', l.reach),
        erledigt: zuJaNein(l.erledigt),
        offerte_status: text(l.offStatus),
        offerte_von: text(l.offBy),
        offerte_seit: zuZeitstempel(l.offSeit),
        offerte_hinweis: text(l.offHinweis),
        offerte_hinweis_von: text(l.offHinweisVon),
        offerte_rueckfrage: text(l.offRueckfrage),
        zur_offerte_am: zuDatum(l.zurOffAm),
        besichtigung: l.besichtigung ?? null,
        luftbild: l.luftbild ?? null,
        kommentar_kunde: text(l.comment),
        notiz_intern: text(l.note),
        verlauf_text: text(l.hist),
        erstellt_am: zuZeitstempel(l.createdAt) ?? k.daten.at,
        geloescht_am,
        alt_daten: l,
      },
    }
  })
  const ids = await k.schreiber.schreibe('verkaufschancen', zeilen)
  for (const { nummer } of leads) k.ids.verkaufschancen.set(nummer, /** @type {string} */ (ids.get(`lead:${nummer}`)))
}

/**
 * Zeitachse. Läuft nach den Offerten, weil Einträge auf Offerten (P0131 …) zeigen.
 * @param {Kontext} k
 */
export async function importiereAktivitaeten(k) {
  const zeilen = Object.entries(k.sammlung('activities')).map(([id, a]) => ({
    sammlung: 'activities',
    schluessel: id,
    zeile: {
      alt_id: `activity:${id}`,
      art: k.zuordner.streng('aktivitaet', a.typ, `activities/${id}`, 'notiz'),
      richtung: a.dir === 'in' ? 'ein' : a.dir === 'out' ? 'aus' : null,
      zeitpunkt: zuZeitstempel(a.at) ?? zuZeitstempel(a.createdAt) ?? k.daten.at,
      text: text(a.text),
      ergebnis: text(a.ergebnis),
      person_id: k.person(a.byId ?? a.by),
      kontakt_id: k.ids.kontakte.get(Number(a.kundenNr)) ?? null,
      verkaufschance_id: k.ids.verkaufschancen.get(String(a.leadId)) ?? null,
      offerte_id: k.ids.offerten.get(String(a.projectId)) ?? null,
      projekt_id: k.ids.projekte.get(String(a.projectId)) ?? null,
      mail_kennung: text(a.msgKey),
      details: {
        quelle: a.quelle ?? null,
        erfasst_von: a.loggedBy ?? null,
        verfolgt: a.tracked ?? null,
        aenderungen: a.ch ?? null,
      },
      erstellt_am: zuZeitstempel(a.createdAt) ?? k.daten.at,
      alt_daten: a,
    },
  }))
  await k.schreiber.schreibe('aktivitaeten', zeilen)
}
