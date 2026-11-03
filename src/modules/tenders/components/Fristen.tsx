import { CalendarCheck } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum, formatDatumZeit } from '@/lib/format'
import { useLeitstand, useRegeln } from '../hooks/useSubmission'
import { fristTon, nurDatum } from '../lib/anzeige'
import { fristenplan, wochenbeginn, type FristEintrag } from '../lib/fristen'
import { Box } from './Box'

/** Kalenderwoche nach ISO 8601. */
function kw(datum: string): number {
  const d = new Date(`${datum}T12:00:00Z`)
  const tag = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - tag + 3)
  const erster = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((d.getTime() - erster.getTime()) / 86_400_000 - 3 + ((erster.getUTCDay() + 6) % 7)) / 7)
}

/** Interne Schritte (Prüfung, Post) sind keine Fristen von aussen, sondern Termine, die wir uns selbst setzen. */
const INTERN = new Set(['pruefung', 'post'])

/**
 * Fristen-Agenda: alle Fristen der offenen Dossiers nach Woche, dazu die internen Schritte rückwärts gerechnet
 * (Prüfung 3 Arbeitstage, Postversand nach Regel vor der Eingabe). Ein Klick öffnet die Akte.
 */
export function Fristen({ onOeffnen }: { onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const daten = useLeitstand()
  const regeln = useRegeln().data
  const wochen = useMemo(() => {
    const plan = fristenplan(daten.data ?? [], { postTage: regeln?.post_arbeitstage ?? 2 })
    const m = new Map<string, FristEintrag[]>()
    for (const f of plan) {
      const w = wochenbeginn(f.am)
      m.set(w, [...(m.get(w) ?? []), f])
    }
    return [...m.entries()]
  }, [daten.data, regeln])

  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-96" />
  if (wochen.length === 0) {
    return (
      <Leerzustand
        icon={CalendarCheck}
        titel={t('ausschreibungen.fristen.leer')}
        text={t('ausschreibungen.fristen.leerText')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t('ausschreibungen.fristen.hilfe')}</p>
      {wochen.map(([montag, eintraege]) => (
        <Box
          key={montag}
          titel={t('ausschreibungen.fristen.woche', { kw: kw(montag), datum: formatDatum(montag) })}
          rechts={eintraege.length}
        >
          <ul className="flex flex-col divide-y">
            {eintraege.map((f) => (
              <li key={`${f.dossier.id}-${f.art}`}>
                <button
                  type="button"
                  onClick={() => {
                    onOeffnen(f.dossier.id)
                  }}
                  className="hover:bg-muted/60 focus-visible:ring-ring grid w-full grid-cols-[7.5rem_9rem_1fr] items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 max-sm:grid-cols-1 max-sm:gap-1"
                >
                  <span className="zahlen text-xs">{nurDatum(f.am) ? formatDatum(f.am) : formatDatumZeit(f.am)}</span>
                  <Badge ton={INTERN.has(f.art) ? 'info' : fristTon(f.am)} className="justify-self-start">
                    {t(`ausschreibungen.fristArt.${f.art}`)}
                  </Badge>
                  <span className="min-w-0 truncate">
                    <span className="zahlen text-muted-foreground font-mono text-xs">{f.dossier.nummer}</span>{' '}
                    {f.dossier.titel}
                    {f.dossier.verantwortlich ? (
                      <span className="text-muted-foreground text-xs"> · {f.dossier.verantwortlich}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Box>
      ))}
    </div>
  )
}
