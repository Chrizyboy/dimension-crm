import { useTranslation } from 'react-i18next'
import { GRUPPEN, gruppe, heuteZuerich, type Gruppe } from '../lib/faelligkeit'
import type { Aufgabe, Person } from '../types'
import { AufgabeZeile } from './AufgabeZeile'

/**
 * Liste nach Fälligkeit gruppiert (überfällig, heute, morgen, diese Woche, später, ohne Datum); erledigte ohne
 * Gruppen, die neuesten zuerst. Innerhalb einer Gruppe stehen wichtige Aufgaben oben.
 */
export function AufgabenListe({
  aufgaben,
  personen,
  erledigt,
  zeigePerson,
  aktiv,
  onOeffnen,
}: {
  aufgaben: Aufgabe[]
  personen: Person[]
  erledigt: boolean
  zeigePerson: boolean
  aktiv: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const zeile = (a: Aufgabe) => (
    <AufgabeZeile
      key={a.id}
      aufgabe={a}
      personen={personen}
      zeigePerson={zeigePerson}
      aktiv={a.id === aktiv}
      onOeffnen={() => {
        onOeffnen(a.id)
      }}
    />
  )
  if (erledigt) return <ul className="bg-surface divide-y rounded-lg border">{aufgaben.map(zeile)}</ul>

  const heute = heuteZuerich()
  const nachGruppe = new Map<Gruppe, Aufgabe[]>()
  for (const a of aufgaben) {
    const g = gruppe(a.faellig_am, heute)
    nachGruppe.set(g, [...(nachGruppe.get(g) ?? []), a])
  }
  return (
    <div className="flex flex-col gap-4">
      {GRUPPEN.filter((g) => nachGruppe.has(g)).map((g) => {
        const liste = [...(nachGruppe.get(g) ?? [])].sort((a, b) => Number(b.wichtig) - Number(a.wichtig))
        return (
          <section key={g} aria-labelledby={`gruppe-${g}`}>
            <h2
              id={`gruppe-${g}`}
              className={`mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold tracking-wide uppercase ${
                g === 'ueberfaellig' ? 'text-bad' : 'text-muted-foreground'
              }`}
            >
              {t(`aufgaben.gruppe.${g}`)}
              <span className="bg-muted text-muted-foreground rounded px-1.5 tabular-nums">{liste.length}</span>
            </h2>
            <ul className="bg-surface divide-y rounded-lg border">{liste.map(zeile)}</ul>
          </section>
        )
      })}
    </div>
  )
}
