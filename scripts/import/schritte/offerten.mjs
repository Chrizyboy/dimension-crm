// Schritt 5: Die Sammlung «projects» der Vorlage war Offerte, Auftrag und Baustelle in einem.
// Daraus entstehen: jede Zeile eine Offerte; angenommene/unterschriebene zusätzlich ein Projekt
// und ein Werkvertrag; Fahrplan-Schritte und Einsätze hängen am Projekt.

import { text, zuDatum, zuGanzzahl, zuRappen, zuSprache, zuZahl, zuZeitstempel } from '../umwandeln.mjs'
import { objektVon } from './kunden.mjs'

/** @typedef {import('../import-vorlage.mjs').Kontext} Kontext */

const AUFTRAG = new Set(['closed', 'construction', 'done'])
const CHECKLISTE = ['drt', 'ai', 'schema', 'iat', 'rsF', 'pmF', 'rsR', 'pmR', 'certification']
const FAHRPLAN_STAND = /** @type {Record<string, string>} */ ({
  open: 'offen',
  ok: 'erledigt',
  nv: 'nicht_noetig',
  part: 'teilweise',
})

/** @param {Record<string, any>} p */
const hatWerkvertragsDatei = (p) => (p.sp?.files ?? []).some((/** @type {any} */ f) => f.folder === 'werkvertrag')

/**
 * Firma des Vertrags nach Standort; ohne Angabe bleibt sie leer statt geraten.
 * @param {Kontext} k
 * @param {Record<string, any>} p
 */
function firma(k, p) {
  const s = (text(p.vertragStandort) ?? text(p.standort) ?? '').toLowerCase()
  return s === 'bulle' ? (k.ids.firmen.get('sarl') ?? null) : s === 'muri' ? (k.ids.firmen.get('gmbh') ?? null) : null
}

/**
 * @param {Kontext} k
 */
export async function importiereOfferten(k) {
  const projekte = Object.entries(k.sammlung('projects'))
  /** @type {Set<string>} */
  const vergeben = new Set()
  for (const [id, p] of projekte) {
    let nr = text(p.nr) ?? id
    if (vergeben.has(nr)) {
      k.hinweis(`Offertnummer ${nr} kam doppelt vor; ${id} heisst jetzt ${nr}-${id}`)
      nr = `${nr}-${id}`
    }
    vergeben.add(nr)
    k.ids.offertNr.set(id, nr)
  }

  const offerten = projekte.map(([id, p]) => ({
    sammlung: 'projects',
    schluessel: id,
    zeile: {
      alt_id: `project:${id}`,
      nummer: k.ids.offertNr.get(id),
      kontakt_id: k.ids.kontakte.get(Number(p.kundenNr)),
      objekt_id: objektVon(k, p),
      verkaufschance_id: k.ids.verkaufschancen.get(String(p.leadId)) ?? null,
      jahr: zuGanzzahl(p.jahr),
      titel: text(p.projektname),
      sprache: zuSprache(p.lang),
      status: k.zuordner.streng('offertstatus', p.statusKey, `projects/${id}`, 'in_arbeit'),
      angebot_am: zuDatum(p.angebotAm),
      angebot_am_frueher: zuDatum(p.angebotAmFrueher) ? [zuDatum(p.angebotAmFrueher)] : null,
      betrag_rappen: zuRappen(p.angebotswert),
      leistung_kwp: zuZahl(p.leistung),
      anzahl_module: zuGanzzahl(p.anzahlModule),
      wechselrichter: text(p.wechselrichter),
      batterie: text(p.batterie),
      betrag_manuell: p.vmanuell === true,
      entscheid: text(p.entscheid),
      entscheid_am: zuDatum(p.entscheidAm),
      entscheid_von: text(p.entscheidVon),
      vertagt_grund: text(p.vertagtGrund),
      nachfassen: text(p.nachfolge),
      nachfassen_am: zuDatum(p.nachfolgeTermin),
      zurueckgegeben: p.zurueck ?? null,
      versionen: p.versionen ?? [],
      verantwortlich_id: k.person(p.verantwortlich),
      erstellt_am: zuZeitstempel(p.createdAt) ?? k.daten.at,
      alt_daten: p,
    },
  }))
  const oIds = await k.schreiber.schreibe('offerten', offerten)
  for (const [id] of projekte) k.ids.offerten.set(id, /** @type {string} */ (oIds.get(`project:${id}`)))

  const auftraege = projekte.filter(([, p]) => AUFTRAG.has(p.statusKey) || zuDatum(p.unterzeichnetAm))
  const pIds = await k.schreiber.schreibe(
    'projekte',
    auftraege.map(([id, p]) => ({
      sammlung: 'projects',
      schluessel: id,
      zeile: {
        alt_id: `project:${id}`,
        nummer: k.ids.offertNr.get(id),
        kontakt_id: k.ids.kontakte.get(Number(p.kundenNr)),
        objekt_id: objektVon(k, p),
        offerte_id: k.ids.offerten.get(id),
        verkaufschance_id: k.ids.verkaufschancen.get(String(p.leadId)) ?? null,
        ablauf_vorlage_id: k.ids.ablauf.get('pv') ?? null,
        titel: text(p.projektname),
        status: AUFTRAG.has(p.statusKey)
          ? k.zuordner.streng('projektstatus', p.statusKey, `projects/${id}`, 'auftrag')
          : 'auftrag',
        bau_status: k.zuordner.streng('baustatus', p.bauStatus, `projects/${id}`),
        standort_id: k.ids.standorte.get((text(p.standort) ?? '').toLowerCase()) ?? null,
        verantwortlich_id: k.person(p.verantwortlich),
        architekt: text(p.architekt),
        elektriker: text(p.elektriker),
        material_status: text(p.material),
        werktage: zuZahl(p.anzahlWerktage),
        baubeginn: zuDatum(p.baubeginn),
        unterzeichnet_am: zuDatum(p.unterzeichnetAm),
        vertragswert_rappen: zuRappen(p.vertragswert),
        vertrag_sprache: text(p.vertragLang),
        werkvertrag: p.werkvertrag ?? null,
        checkliste: Object.fromEntries(CHECKLISTE.filter((f) => p[f] !== undefined).map((f) => [f, p[f]])),
        bewilligungen: p.bew ?? {},
        zahlungskonditionen: text(p.zahlKond),
        alt_daten: p,
      },
    })),
  )
  for (const [id] of auftraege) k.ids.projekte.set(id, /** @type {string} */ (pIds.get(`project:${id}`)))

  await k.schreiber
    .schreibe(
      'werkvertraege',
      projekte
        .filter(([, p]) => zuDatum(p.unterzeichnetAm) || p.werkvertrag || hatWerkvertragsDatei(p))
        .map(([id, p]) => ({
          sammlung: 'projects',
          schluessel: id,
          zeile: {
            alt_id: `project:${id}:werkvertrag`,
            nummer: k.ids.offertNr.get(id),
            offerte_id: k.ids.offerten.get(id),
            projekt_id: k.ids.projekte.get(id) ?? null,
            kontakt_id: k.ids.kontakte.get(Number(p.kundenNr)),
            firma_id: firma(k, p),
            sprache: zuSprache(p.vertragLang ?? p.lang),
            betrag_rappen: zuRappen(p.vertragswert) ?? zuRappen(p.angebotswert),
            status: zuDatum(p.unterzeichnetAm) ? 'unterschrieben' : 'erstellt',
            erstellt_datum: zuDatum(p.werkvertrag?.erstelltAm),
            unterschrieben_am: zuDatum(p.unterzeichnetAm),
            alt_daten: {
              werkvertrag: p.werkvertrag ?? null,
              unterzeichnetAm: p.unterzeichnetAm ?? null,
              vertragswert: p.vertragswert ?? null,
            },
          },
        })),
    )
    .then((ids) => {
      for (const [alt, id] of ids) k.ids.werkvertraege.set(alt.replace(/^project:|:werkvertrag$/g, ''), id)
    })

  await importiereBauDaten(k, auftraege)
}

/**
 * Fahrplan-Stand (fp) und Einsätze (plan) der Aufträge.
 * @param {Kontext} k
 * @param {[string, Record<string, any>][]} auftraege
 */
async function importiereBauDaten(k, auftraege) {
  const schritte = auftraege.flatMap(([id, p]) =>
    Object.entries(p.fp ?? {}).map(([schluessel, stand]) => {
      const neu = FAHRPLAN_STAND[String(stand)]
      if (!neu)
        k.hinweis(
          `Projekt ${id}: unbekannter Fahrplan-Stand «${String(stand)}» bei ${schluessel}, als «offen» übernommen`,
        )
      return {
        sammlung: 'projects',
        schluessel: id,
        zeile: {
          alt_id: `project:${id}:fp:${schluessel}`,
          projekt_id: k.ids.projekte.get(id),
          ablauf_schritt_id: k.ids.pvSchritte.get(schluessel) ?? null,
          schluessel,
          stand: neu ?? 'offen',
        },
      }
    }),
  )
  await k.schreiber.schreibe('projekt_schritte', schritte)

  const einsaetze = auftraege.flatMap(([id, p]) =>
    (Array.isArray(p.plan) ? p.plan : [])
      .filter((/** @type {any} */ e) => zuDatum(e.von))
      .map((/** @type {any} */ e, /** @type {number} */ i) => ({
        sammlung: 'projects',
        schluessel: id,
        zeile: {
          alt_id: `project:${id}:plan:${i}`,
          projekt_id: k.ids.projekte.get(id),
          art: text(e.art) ?? 'geplant',
          von: zuDatum(e.von),
          bis: zuDatum(e.bis) ?? zuDatum(e.von),
          team: Array.isArray(e.team) ? e.team : [],
          notiz: text(e.notiz),
        },
      })),
  )
  await k.schreiber.schreibe('einsaetze', einsaetze)
}
