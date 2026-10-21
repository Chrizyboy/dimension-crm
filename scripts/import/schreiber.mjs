// Schreibt Zeilen in Supabase und führt die Abgleichsliste alt → neu.
// Upsert über alt_id: derselbe Import kann beliebig oft laufen und aktualisiert statt zu verdoppeln.

const PAKET = 200

/** @typedef {{ sammlung: string, schluessel: string, zeile: Record<string, unknown> & { alt_id: string } }} Eintrag */

export class Schreiber {
  /** @param {import('@supabase/supabase-js').SupabaseClient} db */
  constructor(db) {
    this.db = db
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
      const teil = zeilen.slice(i, i + PAKET)
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
