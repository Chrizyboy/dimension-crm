import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Kurzzeichen } from '@/components/shared/Kurzzeichen'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { arbeitstage, tageText } from '../lib/zeit'
import { abwesenheitEntscheiden } from '../services/zeit'
import type { Abwesenheit, Zeiterfassung } from '../types'
import { AblehnenDialog } from './AblehnenDialog'

/**
 * Offene Anträge für die Zeit-Leitung: wer, was, wann, wie viele Arbeitstage und die Restferien danach. Ein Klick
 * bewilligt, Ablehnen fragt nach dem Grund; die Person bekommt in beiden Fällen eine Glocke.
 */
export function Antraege({ daten, antraege }: { daten: Zeiterfassung; antraege: readonly Abwesenheit[] }) {
  const { t } = useTranslation()
  const arten = useAuswahl('abwesenheit')
  const { laeuft, aus } = useAktion()
  const [ablehnen, setAblehnen] = useState<Abwesenheit | null>(null)
  const feiertage = daten.feiertage.map((f) => f.tag)

  return (
    <section aria-labelledby="ab-antraege" className="flex flex-col gap-2">
      <h2 id="ab-antraege" className="text-sm font-semibold">
        {t('zeit.antraege.titel', { count: antraege.length })}
      </h2>
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {antraege.map((a) => {
          const p = daten.personen.find((x) => x.id === a.person_id)
          const tage = arbeitstage(a.von, a.bis, feiertage, a.halbtag)
          const ferien = arten.finde(a.art)?.eigenschaften.ferien === true
          return (
            <li key={a.id} className="bg-surface border-warn/40 flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {p && <Kurzzeichen person={p} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p?.name ?? '?'}</p>
                  <p className="text-muted-foreground text-xs">
                    {arten.text(a.art)} · {formatDatum(a.von)}
                    {a.bis !== a.von ? ` – ${formatDatum(a.bis)}` : ''} ·{' '}
                    {t('zeit.antraege.tage', { tage: tageText(tage) })}
                  </p>
                </div>
              </div>
              {a.bemerkung && <p className="text-sm">«{a.bemerkung}»</p>}
              {ferien && p && (
                <p className="text-muted-foreground text-xs">
                  {t('zeit.antraege.restDanach', { tage: tageText(p.konto.ferien.rest - tage) })}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  laedt={laeuft}
                  onClick={() => void aus(() => abwesenheitEntscheiden(a.id, true), { de: 'Bewilligt', fr: 'Validée' })}
                >
                  <Check />
                  {t('zeit.antraege.bewilligen')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setAblehnen(a)
                  }}
                >
                  <X />
                  {t('zeit.antraege.ablehnen')}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      {ablehnen && (
        <AblehnenDialog
          abwesenheit={ablehnen}
          onSchliessen={() => {
            setAblehnen(null)
          }}
        />
      )}
    </section>
  )
}
