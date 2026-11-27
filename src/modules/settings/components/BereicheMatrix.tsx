import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Kurzzeichen } from '@/components/shared/Kurzzeichen'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { useUi } from '@/stores/ui'
import type { ModulMeta } from '@/types/modul'
import { useBenutzerAenderung } from '../hooks/useBenutzer'
import { umschalten, waehlbareBereiche, wirksameBereiche } from '../lib/sichtbareBereiche'
import { speicherePerson } from '../services/benutzer'
import type { Person, Rolle } from '../types'

/**
 * «Bereiche je Person» (wie die Häkchen der Nutzerverwaltung in V234, aber alle Personen auf einen Blick): Zeile je
 * Person, Spalte je Bereich. Ohne eigene Auswahl gilt die Rolle (grau «wie Rolle»); das erste Häkchen macht daraus
 * eine eigene Auswahl, «Wie Rolle» setzt sie zurück. Nur die Administration sieht ohnehin alles; ohne Auswahl gibt es nur Mein Tag. Speichert sofort.
 */
export function BereicheMatrix({
  personen,
  rollen,
  module,
}: {
  personen: Person[]
  rollen: Rolle[]
  module: readonly ModulMeta[]
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const spalten = waehlbareBereiche(module)
  const alle = spalten.map((m) => m.id)
  const speichern = useBenutzerAenderung((x: { id: string; bereiche: string[] }) =>
    speicherePerson(x.id, { bereiche: x.bereiche }),
  )
  const setze = (id: string, bereiche: string[]) => {
    speichern.mutate(
      { id, bereiche },
      {
        onError: (e) => {
          meldeFehler(e)
        },
      },
    )
  }
  const rollenName = (r: Rolle | undefined) => (r ? (sprache === 'fr' ? r.name_fr : r.name_de) : '')

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground px-4 pt-3 text-xs">{t('benutzer.matrix.hinweis')}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{t('benutzer.matrix.titel')}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="bg-surface sticky left-0 z-10 border-b px-4 py-2 text-left align-bottom font-semibold"
              >
                {t('benutzer.name')}
              </th>
              {spalten.map((m) => (
                <th
                  key={m.id}
                  scope="col"
                  title={m.titel[sprache]}
                  className="text-muted-foreground border-b px-1 py-2 align-bottom font-normal"
                >
                  {/* Senkrechter Name: 20 Spalten passen so nebeneinander und bleiben lesbar. */}
                  <span className="mx-auto flex w-5 flex-col items-center gap-1.5">
                    <span className="max-h-36 rotate-180 truncate text-xs [writing-mode:vertical-rl]">
                      {(m.kurztitel ?? m.titel)[sprache]}
                    </span>
                    <ModulIcon name={m.icon} className="size-4 shrink-0" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personen
              .filter((p) => p.aktiv)
              .map((p) => {
                const rolle = rollen.find((r) => r.schluessel === p.rolle)
                const { bereiche, quelle } = wirksameBereiche(p, rolle, alle)
                const alles = quelle === 'alle'
                return (
                  <tr key={p.id} className="hover:bg-surface-2/60">
                    <th
                      scope="row"
                      className="bg-surface sticky left-0 z-10 border-b px-4 py-1.5 text-left font-normal"
                    >
                      <span className="flex items-center gap-2">
                        <Kurzzeichen person={p} className="size-7 shrink-0" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{p.name}</span>
                          <span className="text-muted-foreground truncate text-xs">
                            {rollenName(rolle)}
                            {' · '}
                            {alles
                              ? t('benutzer.matrix.gl')
                              : quelle === 'person'
                                ? t('benutzer.matrix.eigene')
                                : quelle === 'keine'
                                  ? t('benutzer.matrix.keine')
                                  : t('benutzer.matrix.wieRolle')}
                          </span>
                        </span>
                        {quelle === 'person' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="ml-auto"
                            aria-label={t('benutzer.matrix.zuruecksetzen', { name: p.name })}
                            title={t('benutzer.matrix.zuruecksetzen', { name: p.name })}
                            onClick={() => {
                              setze(p.id, [])
                            }}
                          >
                            <RotateCcw />
                          </Button>
                        )}
                      </span>
                    </th>
                    {spalten.map((m) => {
                      const an = bereiche.includes(m.id)
                      return (
                        <td key={m.id} className="border-b px-1 py-1.5 text-center">
                          <Checkbox
                            className={quelle === 'person' ? 'mx-auto' : 'mx-auto opacity-60'}
                            checked={an}
                            disabled={alles || (an && bereiche.length === 1 && Boolean(rolle?.bereiche.length))}
                            aria-label={`${p.name}: ${m.titel[sprache]}`}
                            onCheckedChange={(wert) => {
                              setze(p.id, umschalten(bereiche, m.id, wert === true))
                            }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground flex flex-wrap items-center gap-2 px-4 pb-3 text-xs">
        <Badge ton="neutral">{t('benutzer.matrix.wieRolle')}</Badge>
        {t('benutzer.matrix.legende')}
      </p>
    </div>
  )
}
