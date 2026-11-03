import { ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { useKurse } from '../hooks/useTeam'
import { kursDatum, kursKosten, kursTage } from '../lib/kurse'
import type { Kurs, TeamPerson } from '../types'
import { KursStandBadge } from './KursStandBadge'

/**
 * Reiter «Kurse»: Kennzahlen (geplant, Anträge, Kosten gegen Budget, Kurstage), dann alle Kurse des Jahres mit Stand.
 * Kosten zeigt die Datenbank nur, wer sie sehen darf. Klick öffnet den Kurs.
 */
export function KursListe({
  personen,
  ichId,
  heute,
  aktiveId,
  onOeffnen,
}: {
  personen: TeamPerson[]
  ichId: string
  heute: string
  aktiveId: string | null
  onOeffnen: (k: Kurs) => void
}) {
  const { t } = useTranslation()
  const quali = useAuswahl('qualifikation')
  const [jahr, setJahr] = useState(Number(heute.slice(0, 4)))
  const [filter, setFilter] = useState('offen')
  const kurse = useKurse(jahr)
  if (kurse.error) return <Fehlerzustand details={String(kurse.error)} onNochmal={() => void kurse.refetch()} />
  if (!kurse.data) return <Skelett className="h-80" />
  const { kurse: alle, budget_rappen: budget, darf } = kurse.data
  const name = (id: string) => personen.find((p) => p.id === id)?.name ?? '?'
  const offen = (k: Kurs) => k.stand !== 'besucht' && k.stand !== 'abgesagt'
  const liste = alle.filter(
    (k) =>
      filter === 'alle' ||
      (filter === 'offen' && offen(k)) ||
      (filter === 'antraege' && k.stand === 'beantragt') ||
      (filter === 'meine' && (k.personen.includes(ichId) || k.beantragt_von === ichId)),
  )
  const kosten = kursKosten(alle)
  const mitKosten = alle.some((k) => k.kosten_rappen !== undefined)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl
          wert={String(
            alle.filter((k) => (k.stand === 'bewilligt' || k.stand === 'angemeldet') && (k.von ?? heute) >= heute)
              .length,
          )}
          text={t('team.kurs.kennzahl.geplant')}
        />
        <Kennzahl
          wert={String(alle.filter((k) => k.stand === 'beantragt').length)}
          text={t('team.kurs.kennzahl.antraege')}
        />
        {mitKosten && (
          <Kennzahl
            wert={formatChf(kosten, { mitWaehrung: true })}
            text={
              budget
                ? t('team.kurs.kennzahl.kostenBudget', { jahr, budget: formatChf(budget, { mitWaehrung: true }) })
                : t('team.kurs.kennzahl.kosten', { jahr })
            }
            anteil={budget ? kosten / budget : null}
          />
        )}
        <Kennzahl wert={t('team.kurs.tage', { count: kursTage(alle) })} text={t('team.kurs.kennzahl.tage', { jahr })} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Filterchips
          einzeln
          beschriftung={t('team.filter')}
          optionen={[
            { wert: 'offen', text: t('team.kurs.filter.offen'), anzahl: alle.filter(offen).length },
            {
              wert: 'antraege',
              text: t('team.kurs.filter.antraege'),
              anzahl: alle.filter((k) => k.stand === 'beantragt').length,
            },
            { wert: 'meine', text: t('team.kurs.filter.meine') },
            { wert: 'alle', text: t('team.filterwert.alle'), anzahl: alle.length },
          ]}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f)
          }}
        />
        <span className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('team.kurs.jahrZurueck')}
            onClick={() => {
              setJahr(jahr - 1)
            }}
          >
            <ChevronLeft />
          </Button>
          <span className="zahlen w-12 text-center text-sm font-medium">{jahr}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('team.kurs.jahrVor')}
            onClick={() => {
              setJahr(jahr + 1)
            }}
          >
            <ChevronRight />
          </Button>
        </span>
      </div>
      {liste.length === 0 ? (
        <Leerzustand icon={GraduationCap} titel={t('team.kurs.leer')} text={t('team.kurs.leerText')} />
      ) : (
        <Tabelle aria-label={t('team.reiter.kurse')}>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t('team.kurs.titel')}</Kopfzelle>
              <Kopfzelle>{t('team.kurs.datum')}</Kopfzelle>
              <Kopfzelle>{t('team.kurs.wer')}</Kopfzelle>
              <Kopfzelle className="hidden md:table-cell">{t('team.kurs.anbieterOrt')}</Kopfzelle>
              {mitKosten && <Kopfzelle className="text-right">{t('team.kurs.kosten')}</Kopfzelle>}
              <Kopfzelle>{t('team.kurs.standTitel')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {liste.map((k) => (
              <Zeile
                key={k.id}
                data-aktiv={k.id === aktiveId}
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => {
                  onOeffnen(k)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOeffnen(k)
                }}
              >
                <Zelle>
                  <span className="flex min-w-48 flex-col">
                    <span className="font-medium">{k.titel}</span>
                    <span className="text-muted-foreground text-xs">
                      {k.art ? t('team.kurs.ergibt', { art: quali.text(k.art) }) : t('team.kurs.weiterbildung')}
                      {k.vereinbarung_bis
                        ? ` · ${t('team.kurs.vereinbarungBis', { datum: formatDatum(k.vereinbarung_bis) })}`
                        : ''}
                    </span>
                  </span>
                </Zelle>
                <Zelle className="zahlen whitespace-nowrap">{kursDatum(k, t('team.kurs.ohneDatum'))}</Zelle>
                <Zelle>{k.personen.map(name).join(', ')}</Zelle>
                <Zelle className="text-muted-foreground hidden md:table-cell">
                  {[k.anbieter, k.ort].filter(Boolean).join(', ') || '–'}
                </Zelle>
                {mitKosten && (
                  <Zelle className="zahlen text-right whitespace-nowrap">
                    {k.kosten_rappen != null ? formatChf(k.kosten_rappen, { mitWaehrung: true }) : '–'}
                  </Zelle>
                )}
                <Zelle>
                  <span className="flex flex-col items-start gap-0.5">
                    <KursStandBadge stand={k.stand} />
                    {k.stand === 'beantragt' && k.darf_bewilligen && (
                      <span className="text-warn text-xs">{t('team.kurs.wartetAufDich')}</span>
                    )}
                  </span>
                </Zelle>
              </Zeile>
            ))}
          </TabelleKoerper>
        </Tabelle>
      )}
      {darf.alle_kosten && !budget && <p className="text-muted-foreground text-xs">{t('team.kurs.ohneBudget')}</p>}
    </div>
  )
}

/** Kleine Kennzahl-Kachel, optional mit Balken (Anteil am Budget). */
function Kennzahl({ wert, text, anteil = null }: { wert: string; text: string; anteil?: number | null }) {
  return (
    <div className="bg-surface flex flex-col gap-0.5 rounded-lg border px-4 py-3">
      <span className="zahlen text-lg font-semibold">{wert}</span>
      <span className="text-muted-foreground text-xs">{text}</span>
      {anteil !== null && (
        <span className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
          <span
            className={anteil > 1 ? 'bg-bad block h-full' : 'bg-accent block h-full'}
            style={{ width: `${String(Math.min(100, Math.round(anteil * 100)))}%` }}
          />
        </span>
      )}
    </div>
  )
}
