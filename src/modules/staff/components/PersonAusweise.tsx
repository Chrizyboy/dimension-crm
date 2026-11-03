import { Paperclip, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { zellenStandMitKurs } from '../lib/kurse'
import { istPflicht } from '../lib/matrix'
import type { AusweisArt, Kurs, Mitglied, Qualifikation } from '../types'
import type { PersonAktion } from './PersonAkte'
import { ZellenBadge } from './ZellenBadge'

/**
 * Reiter «Ausweise» einer Person: fehlende Pflicht zuerst (blau, wenn ein Kurs gebucht ist), dann alle Ausweise mit
 * Stand, Aussteller und Bestätigung als Datei.
 */
export function PersonAusweise({
  person,
  ausweise,
  arten,
  geplant,
  heute,
  darfAendern,
  onAktion,
  onDatei,
}: {
  person: Mitglied
  ausweise: Qualifikation[]
  arten: AusweisArt[]
  /** Gebuchte Kurse dieser Person je Art. */
  geplant: Map<string, Kurs>
  heute: string
  darfAendern: boolean
  onAktion: (a: PersonAktion) => void
  onDatei: (pfad: string) => void
}) {
  const { t } = useTranslation()
  const quali = useAuswahl('qualifikation')
  const fehlend = arten.filter((a) => istPflicht(a, person.rolle) && !ausweise.some((q) => q.art === a.schluessel))
  return (
    <AkteAbschnitt titel={t('team.ausweise')} zusatz={ausweise.length}>
      <ul className="flex flex-col divide-y text-sm">
        {fehlend.map((f) => (
          <li key={f.schluessel} className="flex items-center justify-between gap-2 py-2">
            <span className="font-medium">{quali.text(f.schluessel)}</span>
            <span className="flex items-center gap-1">
              <ZellenBadge
                stand={geplant.get(f.schluessel) ? 'geplant' : 'fehlt'}
                bis={null}
                kursVon={geplant.get(f.schluessel)?.von ?? null}
              />
              {darfAendern && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('team.ausweis.nachtragen', { art: quali.text(f.schluessel) })}
                  onClick={() => {
                    onAktion({ ausweis: null, art: f.schluessel })
                  }}
                >
                  <Plus />
                </Button>
              )}
            </span>
          </li>
        ))}
        {ausweise.map((q) => {
          const art = arten.find((x) => x.schluessel === q.art)
          const stand = zellenStandMitKurs(q, art ? istPflicht(art, person.rolle) : false, heute, geplant.get(q.art))
          return (
            <li key={q.id} className="flex items-center justify-between gap-2 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 font-medium">{quali.text(q.art)}</span>
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {[q.bezeichnung, q.aussteller, q.erworben_am ? formatDatum(q.erworben_am) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <ZellenBadge stand={stand} bis={q.gueltig_bis} kursVon={geplant.get(q.art)?.von ?? null} />
                {q.datei_pfad && darfAendern && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('team.ausweis.dateiAnsehen')}
                    onClick={() => {
                      onDatei(q.datei_pfad ?? '')
                    }}
                  >
                    <Paperclip />
                  </Button>
                )}
                {darfAendern && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('team.ausweis.bearbeiten')}
                    onClick={() => {
                      onAktion({ ausweis: q })
                    }}
                  >
                    <Pencil />
                  </Button>
                )}
              </span>
            </li>
          )
        })}
        {ausweise.length === 0 && fehlend.length === 0 && (
          <li className="text-muted-foreground py-2">{t('team.keineAusweise')}</li>
        )}
      </ul>
    </AkteAbschnitt>
  )
}
