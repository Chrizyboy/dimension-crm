// Edge Function «adressbuch» (Entscheid 0049): Firma im UID-Register suchen (für «Neuer Eintrag») und das
// Netzbetreiber-Verzeichnis der ElCom einlesen (nur Administration). Beide Dienste des Bundes sind öffentlich.
// Das Einlesen läuft in Schritten, damit kein Aufruf zu lange dauert: die App ruft so lange auf, bis «naechster»
// leer ist (verzeichnis → plz … plz → zuordnen).

import { elcomVerzeichnis, plzGemeinden } from '../_shared/elcom.ts'
import { dienst } from '../_shared/datenbank.ts'
import { starte, textFeld } from '../_shared/funktion.ts'
import { DienstFehler } from '../_shared/http.ts'
import { uidSuche } from '../_shared/uid_register.ts'

type Schritt = 'verzeichnis' | 'plz' | 'zuordnen'

/** Tarifjahr aus den Einstellungen, sonst das laufende. */
async function tarifjahr(): Promise<number> {
  const [e] = await dienst.lies<{ wert: { elcom?: { jahr?: number | null } } }[]>(
    'einstellungen?schluessel=eq.adressbuch&select=wert',
  )
  return e?.wert.elcom?.jahr ?? new Date().getFullYear()
}

/** Dienst des Bundes nicht erreichbar: kurzer Code für die App statt eines technischen Fehlers. */
function ausfall(code: string, f: unknown): never {
  if (f instanceof DienstFehler && f.status !== 400) throw new DienstFehler(code, 502, f.message)
  throw f
}

starte({
  uid_suche: {
    recht: 'basis',
    f: async (e) => {
      const name = textFeld(e, 'name').slice(0, 120)
      try {
        return { firmen: await uidSuche(name) }
      } catch (f) {
        ausfall('uid_register', f)
      }
    },
  },

  netzbetreiber_einlesen: {
    recht: 'admin',
    f: async (e) => {
      const schritt = (typeof e.schritt === 'string' ? e.schritt : 'verzeichnis') as Schritt
      if (schritt === 'verzeichnis') {
        const jahr = await tarifjahr()
        let zeilen = await elcomVerzeichnis(jahr).catch((f: unknown) => ausfall('elcom', f))
        let gelesen = jahr
        // Im Herbst ist das neue Tarifjahr oft schon da, im Januar manchmal noch nicht: dann das Vorjahr.
        if (zeilen.length === 0) {
          gelesen = jahr - 1
          zeilen = await elcomVerzeichnis(gelesen).catch((f: unknown) => ausfall('elcom', f))
        }
        if (zeilen.length === 0) throw new DienstFehler('elcom_leer', 502, 'ElCom ohne Daten')
        const anzahl = await dienst.rpc<number>('netzbetreiber_verzeichnis_speichern', {
          p_zeilen: zeilen,
          p_jahr: gelesen,
        })
        return { schritt, jahr: gelesen, zeilen: anzahl, naechster: 'plz' }
      }
      if (schritt === 'plz') {
        const offen = await dienst.rpc<{ plz: string; breite: number | null; laenge: number | null }[]>(
          'plz_gemeinden_offen',
          { p_limit: 120 },
        )
        if (offen.length === 0) return { schritt, plz: 0, naechster: 'zuordnen' }
        const gemeinden = await plzGemeinden(offen).catch((f: unknown) => ausfall('geo_admin', f))
        const anzahl = await dienst.rpc<number>('plz_gemeinden_speichern', { p_zeilen: gemeinden })
        return { schritt, plz: anzahl, naechster: 'plz' }
      }
      if (schritt === 'zuordnen') {
        const r = await dienst.rpc<{ neu: number; gebaeude: number }>('netzbetreiber_zuordnen', {})
        return { schritt, ...r, naechster: null }
      }
      throw new DienstFehler('eingabe', 400, 'schritt')
    },
  },
})
