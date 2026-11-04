// Schreibt Zeilen in Supabase und führt die Abgleichsliste alt → neu.
// Upsert über alt_id: derselbe Import kann beliebig oft laufen und aktualisiert statt zu verdoppeln.
// Was eine Person im neuen CRM schon geändert hat, bleibt (Schutz für den Import am Stichtag), ausser mit
// `ueberschreiben`. Solche Zeilen stehen in `vonHand` und im Bericht.

const PAKET = 200

/** @typedef {{ sammlung: string, schluessel: string, zeile: Record<string, unknown> & { alt_id: string } }} Eintrag */

export class Schreiber {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} db
   * @param {{ ueberschreiben?: boolean }} [optionen]
   */
  constructor(db, optionen = {}) {
    this.db = db
    this.ueberschreiben = optionen.ueberschreiben ?? false
    /** @type {{ tabelle: string, alt_id: string, zuletzt: string }[]} */
    this.vonHand = []
    /** @type {{ sammlung: string, alt_schluessel: string, ziel_tabelle: string, ziel_id: string }[]} */
    this.abgleich = []
  }

  /**
   * Schreibt alle Einträge in eine Tabelle und merkt sich, woher jede Zeile kommt.
   * @param {string} tabelle
   * @param {Eintrag[]} eintraege
   * @returns {Promise<Map<string, string>>} alt_id → neue id
   */
  async schreibe(tabelle, eintraege) {
    /** @type {Map<string, string>} */
    const ids = new Map()
    // Dieselbe alt_id darf in einem Paket nur einmal vorkommen (Postgres-Regel für upsert).
    const zeilen = [...new Map(eintraege.map((e) => [e.zeile.alt_id, e.zeile])).values()]
    for (let i = 0; i < zeilen.length; i += PAKET) {
      const paket = zeilen.slice(i, i + PAKET)
      const geschuetzt = await this.geschuetzt(
        tabelle,
        paket.map((z) => z.alt_id),
      )
      const teil = paket.filter((z) => !geschuetzt.has(z.alt_id))
      if (geschuetzt.size) {
        // Nicht schreiben, aber die id trotzdem holen: andere Tabellen zeigen auf diese Zeile.
        const { data, error } = await this.db
          .from(tabelle)
          .select('id, alt_id')
          .in('alt_id', [...geschuetzt])
        if (error) throw new Error(`${tabelle}: ${error.message}`)
        for (const z of data ?? []) ids.set(z.alt_id, z.id)
      }
      if (!teil.length) continue
      const { data, error } = await this.db
        .from(tabelle)
        // defaultToNull: false, damit fehlende Felder ihren Standardwert bekommen statt null
        .upsert(teil, { onConflict: 'alt_id', defaultToNull: false })
        .select('id, alt_id')
      if (error) throw new Error(`${tabelle}: ${error.message}${error.details ? ` (${error.details})` : ''}`)
      for (const z of data ?? []) ids.set(z.alt_id, z.id)
    }
    for (const e of eintraege) {
      const id = ids.get(e.zeile.alt_id)
      if (!id) throw new Error(`${tabelle}: keine id für ${e.zeile.alt_id}`)
      this.abgleich.push({ sammlung: e.sammlung, alt_schluessel: e.schluessel, ziel_tabelle: tabelle, ziel_id: id })
    }
    return ids
  }

  /**
   * Von den gegebenen alt_ids die, die eine Person im neuen CRM geändert hat (leer mit `ueberschreiben`).
   * Merkt sie sich für den Bericht. Auch für Schritte, die direkt in den Papierkorb legen.
   * @param {string} tabelle
   * @param {string[]} altIds
   * @returns {Promise<Set<string>>}
   */
  async geschuetzt(tabelle, altIds) {
    if (this.ueberschreiben || !altIds.length) return new Set()
    const { data, error } = await this.db.rpc('import_von_hand_geaendert', { p_tabelle: tabelle, p_alt_ids: altIds })
    if (error) throw new Error(`${tabelle} (von Hand geändert?): ${error.message}`)
    /** @type {Set<string>} */
    const gefunden = new Set()
    for (const z of /** @type {{ alt_id: string, zuletzt: string }[]} */ (data ?? [])) {
      gefunden.add(z.alt_id)
      if (!this.vonHand.some((v) => v.tabelle === tabelle && v.alt_id === z.alt_id))
        this.vonHand.push({ tabelle, alt_id: z.alt_id, zuletzt: z.zuletzt })
    }
    return gefunden
  }

  /**
   * Hält eine Zuordnung fest, ohne eine Zeile zu schreiben (z. B. Datei in einen bestehenden Datensatz).
   * @param {string} sammlung
   * @param {string} schluessel
   * @param {string} tabelle
   * @param {string} id
   */
  merke(sammlung, schluessel, tabelle, id) {
    this.abgleich.push({ sammlung, alt_schluessel: schluessel, ziel_tabelle: tabelle, ziel_id: id })
  }

  /** Speichert die Abgleichsliste in der Datenbank. */
  async speichereAbgleich() {
    for (let i = 0; i < this.abgleich.length; i += PAKET * 5) {
      const { error } = await this.db.from('import_abgleich').upsert(this.abgleich.slice(i, i + PAKET * 5), {
        onConflict: 'sammlung,alt_schluessel,ziel_tabelle,ziel_id',
        ignoreDuplicates: true,
      })
      if (error) throw new Error(`import_abgleich: ${error.message}`)
    }
  }
}
