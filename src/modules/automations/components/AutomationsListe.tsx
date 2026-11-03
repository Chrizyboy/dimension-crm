import { AlertTriangle, ChevronRight, Filter, History, Pencil, Search, Send, Workflow } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Karte } from '@/components/ui/karte'
import { formatRelativ } from '@/lib/format'
import { Switch } from '@/components/ui/schalter'
import { useUi } from '@/stores/ui'
import { useAktion, useAutomationen, useKatalog } from '../hooks/useAutomationen'
import { useKennzahlen } from '../hooks/useAusbau'
import { gehtNachAussen, wartetageTotal } from '../lib/anzeige'
import { nachBereich, passtZuSuche } from '../lib/bereich'
import { schalteAutomation } from '../services/automationen'
import type { Automation, Katalog, Kennzahl } from '../types'
import { AKTION_ICON, AUSLOESER_ICON } from './symbole'

interface Props {
  onBearbeiten: (a: Automation) => void
  onLaeufe: (a: Automation) => void
}

const FILTER = ['alle', 'aktiv', 'aus', 'fehler', 'aussen'] as const
type ListenFilter = (typeof FILTER)[number]

/**
 * Alle Automationen nach Bereich (Verkauf, Offerten, Projekte …) als Karten: Auslöser → Bedingungen → Aktionen,
 * Schalter, Modus und was in den letzten 30 Tagen passiert ist. Suche und Filter für den schnellen Griff.
 */
export function AutomationsListe({ onBearbeiten, onLaeufe }: Props) {
  const { t } = useTranslation()
  const liste = useAutomationen()
  const katalog = useKatalog()
  const kennzahlen = useKennzahlen()
  const [suche, setSuche] = useState('')
  const [filter, setFilter] = useState<ListenFilter>('alle')

  if (liste.error) return <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
  if (liste.isLoading) return <Skelett className="h-64" />
  if (!liste.data?.length) {
    return <Leerzustand icon={Workflow} titel={t('automationen.leerTitel')} text={t('automationen.leerText')} />
  }
  const zahl = (id: string) => kennzahlen.data?.find((k) => k.automation_id === id)
  const passt = (a: Automation, f: ListenFilter) =>
    f === 'alle' ||
    (f === 'aktiv' && a.aktiv) ||
    (f === 'aus' && !a.aktiv) ||
    (f === 'fehler' && (zahl(a.id)?.mit_fehler ?? 0) > 0) ||
    (f === 'aussen' && gehtNachAussen(a, katalog.data))
  const gefiltert = liste.data.filter((a) => passt(a, filter) && passtZuSuche(a, suche))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-2 left-2.5 size-4" aria-hidden="true" />
          <Input
            className="pl-8"
            type="search"
            aria-label={t('automationen.liste.suche')}
            placeholder={t('automationen.liste.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        </div>
        <Filterchips
          einzeln
          beschriftung={t('automationen.liste.filterTitel')}
          gewaehlt={[filter]}
          optionen={FILTER.map((f) => ({
            wert: f,
            text: t(`automationen.liste.filter.${f}`),
            anzahl: liste.data.filter((a) => passt(a, f)).length,
          }))}
          onChange={([f]) => {
            setFilter((f ?? 'alle') as ListenFilter)
          }}
        />
      </div>
      {gefiltert.length === 0 && <p className="text-muted-foreground text-sm">{t('automationen.liste.keine')}</p>}
      {nachBereich(gefiltert).map(([bereich, eintraege]) => (
        <section key={bereich} className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {t(`automationen.bereich.${bereich}`)}
          </h2>
          <ul className="grid gap-3 xl:grid-cols-2">
            {eintraege.map((a) => (
              <AutomationKarte
                key={a.id}
                a={a}
                katalog={katalog.data}
                zahl={zahl(a.id)}
                onBearbeiten={onBearbeiten}
                onLaeufe={onLaeufe}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function AutomationKarte({
  a,
  katalog,
  zahl,
  onBearbeiten,
  onLaeufe,
}: {
  a: Automation
  katalog: Katalog | undefined
  zahl: Kennzahl | undefined
} & Props) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { aus } = useAktion()
  const art = katalog?.ereignisse.find((e) => e.schluessel === a.ausloeser)?.art ?? 'sofort'
  const Ausloeser = AUSLOESER_ICON[art]
  const aussen = gehtNachAussen(a, katalog)
  const tage = wartetageTotal(a.aktionen)
  return (
    <li key={a.id}>
      <Karte className="flex h-full flex-col gap-3 p-4" data-testid="automation">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-sm font-semibold">{sprache === 'fr' ? a.name_fr : a.name_de}</p>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {(sprache === 'fr' ? a.beschreibung_fr : a.beschreibung_de) ?? ''}
            </p>
          </div>
          <Switch
            checked={a.aktiv}
            aria-label={t('automationen.editor.aktiv')}
            onCheckedChange={(an) => {
              void aus(
                () => schalteAutomation(a.id, an),
                an ? { de: 'Eingeschaltet', fr: 'Activée' } : { de: 'Ausgeschaltet', fr: 'Désactivée' },
              )
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="bg-accent-soft text-accent-ink inline-flex h-6 items-center gap-1 rounded-full px-2 font-medium">
            <Ausloeser className="size-3.5" aria-hidden="true" />
            {t(`automationen.ereignis.${a.ausloeser.replace('.', '_')}`)}
          </span>
          {a.bedingungen.length > 0 && (
            <>
              <ChevronRight className="text-muted-foreground size-3" aria-hidden="true" />
              <span className="bg-muted inline-flex h-6 items-center gap-1 rounded-full px-2">
                <Filter className="size-3" aria-hidden="true" />
                {t('automationen.bedingungen', { count: a.bedingungen.length })}
              </span>
            </>
          )}
          <ChevronRight className="text-muted-foreground size-3" aria-hidden="true" />
          {a.aktionen.map((x, i) => {
            const Icon = AKTION_ICON[x.art]
            return (
              <span
                key={i}
                title={t(`automationen.aktion.${x.art}`)}
                className="bg-muted inline-flex h-6 items-center gap-1 rounded-full px-2"
              >
                <Icon className="size-3" aria-hidden="true" />
                {x.art === 'warten'
                  ? t('automationen.tageKurz', { count: x.tage ?? 0 })
                  : t(`automationen.aktionKurz.${x.art}`)}
              </span>
            )
          })}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          {aussen && (
            <Badge ton={a.modus === 'automatisch' ? 'warnung' : 'info'}>
              <Send />
              {t(a.modus === 'automatisch' ? 'automationen.modus.automatisch' : 'automationen.mitFreigabe')}
            </Badge>
          )}
          {tage > 0 && <Badge>{t('automationen.dauer', { count: tage })}</Badge>}
          {!a.aktiv && <Badge>{t('automationen.aus')}</Badge>}
          {(zahl?.mit_fehler ?? 0) > 0 && (
            <Badge ton="kritisch">
              <AlertTriangle />
              {t('automationen.fehlerZahl', { count: zahl?.mit_fehler ?? 0 })}
            </Badge>
          )}
          {zahl?.zuletzt_am && (
            <span className="text-muted-foreground text-xs">
              {t('automationen.liste.zuletzt', { zeit: formatRelativ(zahl.zuletzt_am, sprache) })}
            </span>
          )}
          <span className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onLaeufe(a)
              }}
            >
              <History />
              {t('automationen.laeufeZahl', { count: zahl?.laeufe ?? 0 })}
              {(zahl?.wartend ?? 0) > 0 && (
                <span className="text-muted-foreground">
                  ({t('automationen.offenZahl', { count: zahl?.wartend ?? 0 })})
                </span>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onBearbeiten(a)
              }}
            >
              <Pencil />
              {t('allgemein.bearbeiten')}
            </Button>
          </span>
        </div>
      </Karte>
    </li>
  )
}
