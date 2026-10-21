// Schritt 1: Mitarbeitende und Einladungen. Passwort-Hashes werden bewusst nicht übernommen
// (Anmeldung ab Phase 4 mit Microsoft); Einladungscodes waren nur als Hash gespeichert und sind verfallen.

import { bereicheAusRegistern, ohne, text, zuSprache, zuZeitstempel } from '../umwandeln.mjs'

/** @typedef {import('../import-vorlage.mjs').Kontext} Kontext */

/**
 * Liest die festen Stammdaten (Standorte, Firmen, Regionen, Lieferanten, Ablauf-Vorlagen) für Verknüpfungen.
 * @param {Kontext} k
 */
export async function ladeStammdaten(k) {
  const lies = async (/** @type {string} */ tabelle, /** @type {string} */ spalten) => {
    const { data, error } = await k.db.from(tabelle).select(spalten)
    if (error) throw new Error(`${tabelle}: ${error.message}`)
    return /** @type {any[]} */ (data)
  }
  for (const s of await lies('standorte', 'id, kuerzel, name')) k.ids.standorte.set(s.name.toLowerCase(), s.id)
  for (const f of await lies('firmen', 'id, kuerzel')) k.ids.firmen.set(f.kuerzel, f.id)
  for (const r of await lies('regionen', 'id, nummer')) k.ids.regionen.set(r.nummer, r.id)
  for (const l of await lies('lieferanten', 'id, name')) k.ids.lieferanten.set(l.name.toLowerCase(), l.id)
  for (const a of await lies('ablauf_vorlagen', 'id, schluessel')) k.ids.ablauf.set(a.schluessel, a.id)
  for (const s of await lies('ablauf_schritte', 'id, schluessel, ablauf_vorlage_id'))
    if (s.ablauf_vorlage_id === k.ids.ablauf.get('pv')) k.ids.pvSchritte.set(s.schluessel, s.id)
}

/**
 * Mitarbeitende (users) und Einladungen (invites).
 * @param {Kontext} k
 */
export async function importiereOrganisation(k) {
  const users = k.sammlung('users')
  const personen = Object.entries(users).map(([kuerzel, u]) => {
    const rechte = [u.finanzen === true && 'finanzen', u.preis === true && 'preise'].filter(Boolean)
    const standort = text(u.profil?.standort)?.toLowerCase()
    return {
      sammlung: 'users',
      schluessel: kuerzel,
      zeile: {
        alt_id: `user:${kuerzel}`,
        kuerzel,
        name: text(u.name) ?? kuerzel,
        email: text(u.email)?.toLowerCase() ?? null,
        rolle: u.role === 'admin' ? 'admin' : 'mitarbeit',
        rechte,
        bereiche: bereicheAusRegistern(u.regs),
        aktiv: u.active !== false,
        sprache: zuSprache(u.prefs?.lang),
        darstellung: text(u.prefs?.theme),
        standort_id: (standort && k.ids.standorte.get(standort)) ?? null,
        profil: u.profil ?? {},
        zuletzt_aktiv: zuZeitstempel(u.lastSeen ?? u.lastLogin),
        erstellt_am: zuZeitstempel(u.createdAt) ?? k.daten.at,
        alt_daten: ohne(u, ['pw']),
      },
    }
  })
  const ids = await k.schreiber.schreibe('personen', personen)
  for (const p of personen) {
    const id = /** @type {string} */ (ids.get(p.zeile.alt_id))
    k.ids.personen.set(p.schluessel, id)
    // Die Vorlage nennt Personen oft nur beim Vornamen («Loris»).
    k.ids.personen.set(String(p.zeile.name).split(' ')[0]?.toLowerCase() ?? p.schluessel, id)
    k.ids.personen.set(String(p.zeile.name).toLowerCase(), id)
  }

  const einladungen = Object.entries(k.sammlung('invites')).map(([schluessel, e]) => ({
    sammlung: 'invites',
    schluessel,
    zeile: {
      alt_id: `invite:${text(e.uid) ?? ''}:${text(e.at) ?? schluessel.slice(0, 12)}`,
      email: text(e.email)?.toLowerCase() ?? '',
      name: text(e.name),
      person_id: k.person(e.uid),
      eingeladen_von: text(e.byName) ?? text(e.by),
      gueltig_bis: zuZeitstempel(e.exp),
      verwendet_am: zuZeitstempel(e.usedAt),
      widerrufen_am: zuZeitstempel(e.revokedAt),
      erstellt_am: zuZeitstempel(e.at) ?? k.daten.at,
      alt_daten: e,
    },
  }))
  await k.schreiber.schreibe('einladungen', einladungen)
}
