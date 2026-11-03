import { AlertTriangle, CalendarClock, CircleOff, Inbox, ReceiptText, Timer, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatumZeit, formatRelativ } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { useUebersicht } from '../hooks/useAusbau'
import { dauerText, WIRKUNG_ARTEN, wirkungSumme } from '../lib/wirkung'
import type { Ansicht, Uebersicht as Daten } from '../types'
import { AufmerksamkeitListe } from './AufmerksamkeitListe'
import { LaufNachId } from './LaufNachId'
import { Motorzeile } from './Motorzeile'

/**
 * Startreiter: läuft der Motor, was hat er diese Woche abgenommen, wo hängt etwas, was kommt in 24 Stunden.
 * Damit Chris nicht durchs Protokoll suchen muss, um zu wissen, ob alles läuft.
 */
export function Uebersicht({ onAdresse }: { onAdresse: (a: { ansicht: Ansicht }) => void }) {
  const abfrage = useUebersicht()
  const [lauf, setLauf] = useState<string | null>(null)
  if (abfrage.error) return <Fehlerzustand details={String(abfrage.error)} onNochmal={() => void abfrage.refetch()} />
  if (!abfrage.data) return <Skelett className="h-96" />
  return (
    <div className="flex flex-col gap-4" data-testid="automationen-uebersicht">
      <Motorzeile u={abfrage.data} />
      <Kacheln u={abfrage.data} onAdresse={onAdresse} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <AufmerksamkeitListe eintraege={abfrage.data.aufmerksamkeit} onLauf={setLauf} />
        <div className="flex flex-col gap-4">
          <Naechste
            u={abfrage.data}
            onLauf={setLauf}
            onAlle={() => {
              onAdresse({ ansicht: 'geplant' })
            }}
          />
          <Ausgeschaltet u={abfrage.data} />
        </div>
      </div>
      {lauf && (
        <LaufNachId
          laufId={lauf}
          onSchliessen={() => {
            setLauf(null)
          }}
        />
      )}
    </div>
  )
}

function Kacheln({ u, onAdresse }: { u: Daten; onAdresse: (a: { ansicht: Ansicht }) => void }) {
  const { t } = useTranslation()
  const summe = wirkungSumme(u.wirkung, u.minuten)
  const teile = WIRKUNG_ARTEN.filter((a) => (u.wirkung[a] ?? 0) > 0).map((a) =>
    t(`automationen.uebersicht.wirkung.${a}`, { count: u.wirkung[a] ?? 0 }),
  )
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kachel
        hervor
        icon={Timer}
        titel={t('automationen.uebersicht.erledigt')}
        wert={String(summe.schritte)}
        zusatz={summe.minuten > 0 ? t('automationen.uebersicht.gespart', { dauer: dauerText(summe.minuten) }) : ''}
        fuss={teile.join(' · ')}
      />
      <Kachel
        icon={Inbox}
        titel={t('automationen.uebersicht.mailsWartend')}
        wert={String(u.mails_wartend)}
        zusatz={
          u.mails_alt > 0
            ? t('automationen.uebersicht.mailsAlt', { count: u.mails_alt })
            : t('automationen.uebersicht.mailsFreigegeben', { count: u.mails_freigegeben })
        }
        warnung={u.mails_alt > 0}
        aktion={
          <a href="#/outbox" className="text-primary dark:text-accent text-xs underline-offset-4 hover:underline">
            {t('automationen.uebersicht.zumAusgang')}
          </a>
        }
      />
      <Kachel
        icon={ReceiptText}
        titel={t('automationen.uebersicht.rechnungen')}
        wert={formatChf(u.rechnungen_rappen, { mitWaehrung: true })}
        zusatz={t('automationen.uebersicht.rechnungenHilfe')}
      />
      <Kachel
        icon={AlertTriangle}
        titel={t('automationen.uebersicht.probleme')}
        wert={String(u.probleme)}
        zusatz={t('automationen.uebersicht.vorwoche', { count: u.probleme_vorwoche })}
        warnung={u.probleme > 0}
        aktion={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onAdresse({ ansicht: 'protokoll' })
            }}
          >
            {t('automationen.uebersicht.zumProtokoll')}
          </Button>
        }
      />
    </div>
  )
}

function Kachel(p: {
  icon: LucideIcon
  titel: string
  wert: string
  zusatz?: string
  fuss?: string
  aktion?: ReactNode
  hervor?: boolean
  warnung?: boolean
}) {
  const Icon = p.icon
  return (
    <Karte className={cn('flex flex-col gap-1 p-4', p.hervor && 'bg-primary text-primary-foreground border-primary')}>
      <span className={cn('flex items-center gap-2 text-xs', !p.hervor && 'text-muted-foreground')}>
        <Icon className="size-4" aria-hidden="true" />
        {p.titel}
      </span>
      <span className="font-display zahlen text-2xl font-semibold">{p.wert}</span>
      {p.zusatz && (
        <span className={cn('text-xs', p.warnung ? 'text-warn font-medium' : !p.hervor && 'text-muted-foreground')}>
          {p.zusatz}
        </span>
      )}
      {p.fuss && <span className="text-xs opacity-90">{p.fuss}</span>}
      {p.aktion && <span className="mt-auto pt-1">{p.aktion}</span>}
    </Karte>
  )
}

function Naechste({ u, onLauf, onAlle }: { u: Daten; onLauf: (id: string) => void; onAlle: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('automationen.uebersicht.naechste')}</KarteTitel>
        <Button variant="ghost" size="sm" onClick={onAlle}>
          {t('automationen.uebersicht.alleGeplant')}
        </Button>
      </KarteKopf>
      {u.naechste.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">{t('automationen.uebersicht.nichtsGeplant')}</p>
      ) : (
        <ul>
          {u.naechste.map((g) => (
            <li key={g.lauf_id} className="border-t first:border-t-0">
              <button
                type="button"
                className="hover:bg-muted flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm"
                onClick={() => {
                  onLauf(g.lauf_id)
                }}
              >
                <CalendarClock className="text-info mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="zahlen text-muted-foreground w-24 shrink-0 text-xs">
                  {formatRelativ(g.weiter_am, sprache)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{g.titel ?? '–'}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {t(`automationen.aktion.${g.art ?? 'warten'}`)} · {sprache === 'fr' ? g.name_fr : g.name_de}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}

function Ausgeschaltet({ u }: { u: Daten }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  if (u.ausgeschaltet.length === 0) return null
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('automationen.uebersicht.ausgeschaltet')}</KarteTitel>
      </KarteKopf>
      <ul>
        {u.ausgeschaltet.map((a) => (
          <li key={a.id} className="flex items-start gap-3 border-t px-4 py-2.5 text-sm first:border-t-0">
            <CircleOff className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{sprache === 'fr' ? a.name_fr : a.name_de}</span>
              <span className="text-muted-foreground text-xs">
                {a.von
                  ? t('automationen.uebersicht.ausVon', { von: a.von, zeit: formatDatumZeit(a.seit) })
                  : t('automationen.uebersicht.ausSeit', { zeit: formatDatumZeit(a.seit) })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Karte>
  )
}
