// Schritt 5: Die Sammlung «projects» der Vorlage war Offerte, Auftrag und Baustelle in einem.
// Daraus entstehen: jede Zeile eine Offerte; angenommene/unterschriebene zusätzlich ein Projekt
// und ein Werkvertrag; Fahrplan-Schritte und Einsätze hängen am Projekt.

import { text, zuDatum, zuModulzahl, zuRappen, zuSprache, zuZahl, zuGanzzahl, zuZeitstempel } from '../umwandeln.mjs'
import { alleLeads, objektVon } from './kunden.mjs'
import { offerPerson, offerStandort } from '../v233.mjs'
import { mwstAusVorlage, werkvertragBetrag } from '../entscheide.mjs'

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
 * Standort wie V233 ihn zeigt: eingetragener Standort, sonst nach Sprache der Offerte (fr = Bulle, sonst Muri).
 * @param {Record<string, any>} p
 * @returns {string} «bulle» oder «muri»
 */
function standortVon(p) {
  return (text(p.vertragStandort) ?? text(p.standort) ?? offerStandort(p)).toLowerCase()
}

/**
 * Firma des Vertrags nach Standort (Bulle = Sàrl, Muri = GmbH).
 * @param {Kontext} k
 * @param {Record<string, any>} p
 */
function firma(k, p) {
  const s = standortVon(p)
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

  // «Verantwortlich» rechnete V233 bei jedem Anzeigen aus (offerPerson): nur von Hand Gewähltes war gespeichert.
  // Das neue CRM speichert die Person, deshalb wird hier dieselbe Regel einmal angewendet.
  const leads = alleLeads(k).map(({ nummer, lead }) => ({ ...lead, id: nummer }))
  const verantwortlich = (/** @type {string} */ id, /** @type {Record<string, any>} */ p) =>
    k.person(offerPerson({ ...p, id }, leads))

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
      anzahl_module: zuModulzahl(p.anzahlModule),
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
      verantwortlich_id: verantwortlich(id, p),
      standort_id: k.ids.standorte.get(standortVon(p)) ?? null,
      erstellt_am: zuZeitstempel(p.createdAt) ?? k.daten.at,
      alt_daten: p,
    },
  }))
  const oIds = await k.schreiber.schreibe('offerten', offerten)
  for (const [id] of projekte) k.ids.offerten.set(id, /** @type {string} */ (oIds.get(`project:${id}`)))

  // Ein Unterschriftsdatum allein macht einen Auftrag, ausser die Ablage hat den Stand zurückgesetzt (ablage.mjs).
  const auftraege = projekte.filter(
    ([, p]) => AUFTRAG.has(p.statusKey) || (zuDatum(p.unterzeichnetAm) && p._statusVorlage === undefined),
  )
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
        standort_id: k.ids.standorte.get(standortVon(p)) ?? null,
        verantwortlich_id: verantwortlich(id, p),
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
        // Wieder gewonnen nach einem früheren Lauf: zurück aus dem Papierkorb.
        geloescht_am: null,
        alt_daten: p,
      },
    })),
  )
  for (const [id] of auftraege) k.ids.projekte.set(id, /** @type {string} */ (pIds.get(`project:${id}`)))
  // Frühere Importe legten für jetzt nicht mehr gewonnene Offerten ein Projekt an: in den Papierkorb, nie hart löschen.
  const keinAuftrag = projekte.filter(([id]) => !auftraege.some(([a]) => a === id)).map(([id]) => `project:${id}`)
  for (let i = 0; i < keinAuftrag.length; i += 200) {
    const { error } = await k.db
      .from('projekte')
      .update({ geloescht_am: new Date().toISOString() })
      .in('alt_id', keinAuftrag.slice(i, i + 200))
      .is('geloescht_am', null)
    if (error) throw new Error(`projekte (kein Auftrag mehr): ${error.message}`)
  }

  const mwst = mwstAusVorlage(k.sammlung('finset'))
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
            betrag_rappen: werkvertragBetrag(p, mwst).betrag,
            status: zuDatum(p.unterzeichnetAm) ? 'unterschrieben' : 'erstellt',
            erstellt_datum: zuDatum(p.werkvertrag?.erstelltAm),
            unterschrieben_am: zuDatum(p.unterzeichnetAm),
            alt_daten: {
              werkvertrag: p.werkvertrag ?? null,
              unterzeichnetAm: p.unterzeichnetAm ?? null,
              vertragswert: p.vertragswert ?? null,
              mwst_ergaenzt: werkvertragBetrag(p, mwst).mwstErgaenzt ? mwst : null,
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
