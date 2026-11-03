import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { kursVorschlaege, zellenStandMitKurs } from '../lib/kurse'
import { istPflicht } from '../lib/matrix'
import type { AusweisArt, Kurs, Qualifikation, TeamPerson } from '../types'
import { Matrix } from './Matrix'

/**
 * Reiter «Ausweise»: Vorschlag «Kurs planen» für alles, was fehlt oder abläuft (gemeinsamer Kurs statt
 * Einzeltermine), Filter und die Übersicht «wer darf was». Den Vorschlag sieht, wer planen darf: Recht «personal»
 * für alle, Vorgesetzte für die eigenen Mitarbeitenden.
 */
export function AusweiseReiter({
  personen,
  arten,
  gueltig,
  geplant,
  heute,
  ichId,
  allePlanen,
  aktiveId,
  onOeffnen,
  onKursPlanen,
}: {
  personen: TeamPerson[]
  arten: AusweisArt[]
  gueltig: Map<string, Qualifikation>
  geplant: Map<string, Kurs>
  heute: string
  ichId: string
  allePlanen: boolean
  aktiveId: string | null
  onOeffnen: (id: string) => void
  onKursPlanen: (art: string, personen: string[]) => void
}) {
  const { t } = useTranslation()
  const quali = useAuswahl('qualifikation')
  const [filter, setFilter] = useState('probleme')
  const planbar = personen.filter((p) => allePlanen || p.vorgesetzt_id === ichId)
  const vorschlaege = kursVorschlaege(planbar, arten, gueltig, geplant, heute).slice(0, 3)
  const name = (id: string) => personen.find((p) => p.id === id)?.name ?? ''
  const offen = (p: TeamPerson) =>
    arten.some((a) => {
      const s = zellenStandMitKurs(
        gueltig.get(`${p.id}:${a.schluessel}`),
        istPflicht(a, p.rolle),
        heute,
        geplant.get(`${p.id}:${a.schluessel}`),
      )
      return s === 'fehlt' || s === 'abgelaufen' || s === 'bald' || s === 'geplant'
    })
  const standorte = [...new Set(personen.map((p) => p.standort).filter((s): s is string => Boolean(s)))]
  const liste = personen.filter(
    (p) =>
      filter === 'alle' ||
      (filter === 'probleme' && offen(p)) ||
      (filter === 'pflicht' && arten.some((a) => istPflicht(a, p.rolle))) ||
      filter === `ort:${p.standort ?? ''}`,
  )

  return (
    <div className="flex flex-col gap-3">
      {vorschlaege.map((v) => (
        <div
          key={v.art}
          className="bg-accent-soft text-accent-ink flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm"
        >
          <span>
            <strong className="text-foreground">
              {t('team.vorschlag.titel', { art: quali.text(v.art), count: v.personen.length })}
            </strong>{' '}
            {v.personen.map(name).join(', ')}
          </span>
          <Button
            size="sm"
            onClick={() => {
              onKursPlanen(v.art, v.personen)
            }}
          >
            <CalendarPlus />
            {t('team.vorschlag.planen', { count: v.personen.length })}
          </Button>
        </div>
      ))}
      <Filterchips
        einzeln
        beschriftung={t('team.filter')}
        optionen={[
          { wert: 'probleme', text: t('team.filterwert.probleme'), anzahl: personen.filter(offen).length },
          { wert: 'pflicht', text: t('team.filterwert.pflicht') },
          ...standorte.map((s) => ({ wert: `ort:${s}`, text: s })),
          { wert: 'alle', text: t('team.filterwert.alle'), anzahl: personen.length },
        ]}
        gewaehlt={[filter]}
        onChange={([f]) => {
          if (f) setFilter(f)
        }}
      />
      <Matrix
        personen={liste}
        arten={arten}
        gueltig={gueltig}
        geplant={geplant}
        heute={heute}
        aktiveId={aktiveId}
        onOeffnen={onOeffnen}
      />
      <p className="text-muted-foreground text-xs">{t('team.legende')}</p>
    </div>
  )
}
