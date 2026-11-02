import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fachFehlerSchluessel, zweisprachig } from './fachfehler'
import { meldeFehler } from './fehler'
import { melde } from './meldungen'
import { supabase } from './supabase'

/**
 * Was Automationen für einen Datensatz geplant haben, und die Knöpfe dazu (Entscheid 0044). Gemeinsamer Dienst,
 * weil Akten (Lead, Offerte, Projekt), Aufgaben und das Modul «Automationen» ihn brauchen. Rechte prüft die
 * Datenbank: stoppen und verschieben dürfen Administration, Geschäftsleitung und die zuständige Person.
 */
export interface GeplanterSchritt {
  lauf_id: string
  automation_id: string
  name_de: string
  name_fr: string
  titel: string | null
  tabelle: string | null
  bezug_id: string | null
  stand: 'laeuft' | 'wartet' | 'server' | 'gestoppt'
  weiter_am: string
  schritt: number
  schritte: number
  art: string | null
  text_de: string | null
  text_fr: string | null
  nach_aussen: boolean
  modus: 'freigabe' | 'automatisch'
  grund: string | null
  darf: boolean
}

/** Antwort auf «Warum habe ich diese Aufgabe?». */
export interface Warum {
  lauf_id: string
  automation_id: string
  name_de: string
  name_fr: string
  beschreibung_de: string | null
  beschreibung_fr: string | null
  ausloeser: string
  titel: string | null
  ziel: string | null
  erstellt_am: string
  stand: string
  darf: boolean
}

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Geplante Schritte eines Datensatzes (Tabelle wie in der Datenbank, z. B. «offerten»). */
export function useGeplantFuer(tabelle: string, id: string | null | undefined) {
  return useQuery({
    queryKey: ['automationen', 'geplant', tabelle, id],
    enabled: Boolean(supabase && id),
    queryFn: async () => {
      const { data, error } = await db().rpc('automation_geplant', { p_tabelle: tabelle, p_id: id ?? '' })
      if (error) throw error
      return data as unknown as GeplanterSchritt[]
    },
  })
}

/** Woher kommt eine Aufgabe? Null, wenn sie nicht aus einer Automation stammt oder die Person sie nicht sehen darf. */
export function useWarum(laufId: string | null | undefined, aktiv: boolean) {
  return useQuery({
    queryKey: ['automationen', 'warum', laufId],
    enabled: Boolean(supabase && laufId && aktiv),
    queryFn: async () => {
      const { data, error } = await db().rpc('automation_warum', { p_lauf: laufId ?? '' })
      if (error) throw error
      return data as unknown as Warum | null
    },
  })
}

/** Für diesen Datensatz anhalten; der Grund kommt ins Protokoll und in die Zeitachse des Kunden. */
export async function laufStoppen(lauf: string, grund: string): Promise<void> {
  const { error } = await db().rpc('automation_lauf_stoppen', { p_lauf: lauf, p_grund: grund })
  if (error) throw error
}

/** Gestoppten Lauf weiterlaufen lassen. */
export async function laufFortsetzen(lauf: string): Promise<void> {
  const { error } = await db().rpc('automation_lauf_fortsetzen', { p_lauf: lauf })
  if (error) throw error
}

/** Um Tage verschieben (negativ = früher). */
export async function laufVerschieben(lauf: string, tage: number): Promise<void> {
  const { error } = await db().rpc('automation_lauf_verschieben', { p_lauf: lauf, p_tage: tage })
  if (error) throw error
}

/** Wartezeit überspringen: läuft in der nächsten Minute (Versandfenster gilt weiter). */
export async function laufJetzt(lauf: string): Promise<void> {
  const { error } = await db().rpc('automation_lauf_jetzt', { p_lauf: lauf })
  if (error) throw error
}

/**
 * Knöpfe «Stoppen», «Fortsetzen», «+ Tage», «Jetzt» mit Rückmeldung; Fehler der Datenbank (z. B. «Grund fehlt»)
 * erscheinen übersetzt. Danach laden Akte, Aufgaben und das Modul neu.
 */
export function useLaufSteuerung() {
  const [laeuft, setLaeuft] = useState(false)
  const client = useQueryClient()
  async function aus(f: () => Promise<void>, erfolg: string, werte: Record<string, unknown> = {}): Promise<boolean> {
    setLaeuft(true)
    try {
      await f()
      melde('ok', zweisprachig(erfolg, werte))
      return true
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (s) melde('kritisch', zweisprachig(s))
      else {
        meldeFehler(e, 'automationen')
        melde('kritisch', zweisprachig('automatik.fehler'))
      }
      return false
    } finally {
      setLaeuft(false)
      void client.invalidateQueries({ queryKey: ['automationen'] })
      void client.invalidateQueries({ queryKey: ['aufgaben'] })
    }
  }
  return {
    laeuft,
    stoppen: (lauf: string, grund: string) => aus(() => laufStoppen(lauf, grund), 'automatik.gestoppt'),
    fortsetzen: (lauf: string) => aus(() => laufFortsetzen(lauf), 'automatik.fortgesetzt'),
    verschieben: (lauf: string, tage: number) =>
      aus(() => laufVerschieben(lauf, tage), 'automatik.verschoben', { count: tage }),
    jetzt: (lauf: string) => aus(() => laufJetzt(lauf), 'automatik.jetztOk'),
  }
}
