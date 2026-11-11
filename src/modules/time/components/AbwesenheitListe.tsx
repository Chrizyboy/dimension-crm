import { CalendarOff, Pencil, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Kurzzeichen } from '@/components/shared/Kurzzeichen'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { arbeitstage, heute, tageText } from '../lib/zeit'
import { abwesenheitZurueckziehen } from '../services/zeit'
import type { Abwesenheit, AbwesenheitStatus, Zeiterfassung } from '../types'

const TON: Record<AbwesenheitStatus, 'warnung' | 'ok' | 'kritisch'> = {
  beantragt: 'warnung',
  bewilligt: 'ok',
  abgelehnt: 'kritisch',
}

/**
 * Alle sichtbaren Abwesenheiten des Jahres mit Stand und Entscheid. Ändern und Zurückziehen geht für die eigenen,
 * solange sie nicht begonnen haben (die Zeit-Leitung immer); Kurstage ändert man im Kurs unter «Team & Ausweise».
 */
export function AbwesenheitListe({
  daten,
  onBearbeiten,
}: {
  daten: Zeiterfassung
  onBearbeiten: (a: Abwesenheit) => void
}) {
  const { t } = useTranslation()
  const arten = useAuswahl('abwesenheit')
  const { laeuft, aus } = useAktion()
  const jetzt = heute()
  const feiertage = daten.feiertage.map((f) => f.tag)
  const liste = [...daten.abwesenheiten].sort((a, b) => b.von.localeCompare(a.von))
  const darf = (a: Abwesenheit) =>
    !a.kurs && (daten.leitung || (a.person_id === daten.ich && (a.status !== 'bewilligt' || a.von > jetzt)))

  return (
    <section aria-labelledby="ab-liste" className="flex flex-col gap-2">
      <h2 id="ab-liste" className="text-sm font-semibold">
        {t('zeit.liste.abwesenheiten', { jahr: daten.jahr })}
      </h2>
      {liste.length === 0 ? (
        <Leerzustand
          icon={CalendarOff}
          titel={t('zeit.liste.keineAbwesenheit')}
          text={t('zeit.liste.keineAbwesenheitText')}
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {liste.map((a) => {
            const p = daten.personen.find((x) => x.id === a.person_id)
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                {daten.leitung && p && <Kurzzeichen person={p} art="text" />}
                <span className="w-44 font-medium">{arten.text(a.art)}</span>
                <span className="zahlen whitespace-nowrap">
                  {formatDatum(a.von)}
                  {a.bis !== a.von ? ` – ${formatDatum(a.bis)}` : ''}
                </span>
                <span className="text-muted-foreground">
                  {t('zeit.antraege.tage', { tage: tageText(arbeitstage(a.von, a.bis, feiertage, a.halbtag)) })}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate">
                  {a.entscheid_grund ?? a.bemerkung ?? ''}
                </span>
                <Badge ton={TON[a.status]}>
                  {t(`zeit.stand.${a.status}`)}
                  {a.entscheid_von && a.status !== 'beantragt' ? ` · ${a.entscheid_von}` : ''}
                </Badge>
                {darf(a) && (
                  <span className="flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('zeit.liste.bearbeiten')}
                      onClick={() => {
                        onBearbeiten(a)
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('zeit.liste.zurueckziehen')}
                      disabled={laeuft}
                      onClick={() =>
                        void aus(() => abwesenheitZurueckziehen(a.id), {
                          de: 'Zurückgezogen (Papierkorb)',
                          fr: 'Retirée (corbeille)',
                        })
                      }
                    >
                      <Undo2 />
                    </Button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
