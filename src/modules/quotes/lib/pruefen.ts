import type { Eingang } from '../types'

const IN_ARBEIT = new Set(['neu', 'bearbeitung', 'rueckfrage', 'pruefung'])

/**
 * Was ich prüfen und senden soll (V234 «Offerten prüfen & senden»): Offerten zur Prüfung, bei denen ich den
 * Termin hatte, und Richtofferten (ohne Termin), an denen ich arbeite. Die älteste zuerst.
 */
export function zuPruefen(eingang: readonly Eingang[], ich: { id: string; name: string } | null): Eingang[] {
  if (!ich) return []
  const vorname = ich.name.trim().split(/\s+/)[0] ?? ''
  return eingang
    .filter((e) =>
      e.richtofferte
        ? IN_ARBEIT.has(e.status) && e.status !== 'neu' && e.von === vorname
        : e.status === 'pruefung' && e.terminPersonId === ich.id,
    )
    .sort((a, b) => (a.seit ?? '').localeCompare(b.seit ?? ''))
}
