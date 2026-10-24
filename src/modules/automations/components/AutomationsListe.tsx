import { ChevronRight, Filter, History, Pencil, Send, Workflow } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { useUi } from '@/stores/ui'
import { useAktion, useAutomationen, useKatalog, useLaeufe } from '../hooks/useAutomationen'
import { gehtNachAussen, OFFEN, wartetageTotal } from '../lib/anzeige'
import { schalteAutomation } from '../services/automationen'
import type { Automation } from '../types'
import { AKTION_ICON, AUSLOESER_ICON } from './symbole'

interface Props {
  onBearbeiten: (a: Automation) => void
  onLaeufe: (a: Automation) => void
}

/** Alle Automationen als Karten: Auslöser → Bedingungen → Aktionen, Schalter und Modus auf einen Blick. */
export function AutomationsListe({ onBearbeiten, onLaeufe }: Props) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const liste = useAutomationen()
  const katalog = useKatalog()
  const laeufe = useLaeufe({})
  const { aus } = useAktion()

  if (liste.error) return <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
  if (liste.isLoading) return <Skelett className="h-64" />
  if (!liste.data?.length) {
    return <Leerzustand icon={Workflow} titel={t('automationen.leerTitel')} text={t('automationen.leerText')} />
  }

  const zahlen = (id: string) => {
    const l = laeufe.data?.filter((x) => x.automation_id === id) ?? []
    return { alle: l.length, offen: l.filter((x) => OFFEN.includes(x.stand)).length }
  }

  return (
    <ul className="grid gap-3 xl:grid-cols-2">
      {liste.data.map((a) => {
        const art = katalog.data?.ereignisse.find((e) => e.schluessel === a.ausloeser)?.art ?? 'sofort'
        const Ausloeser = AUSLOESER_ICON[art]
        const aussen = gehtNachAussen(a, katalog.data)
        const tage = wartetageTotal(a.aktionen)
        const z = zahlen(a.id)
        return (
          <li key={a.id}>
            <Karte className="flex h-full flex-col gap-3 p-4" data-testid="automation">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display truncate text-sm font-semibold">
                    {sprache === 'fr' ? a.name_fr : a.name_de}
                  </p>
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
                <span className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onLaeufe(a)
                    }}
                  >
                    <History />
                    {t('automationen.laeufeZahl', { count: z.alle })}
                    {z.offen > 0 && (
                      <span className="text-muted-foreground">({t('automationen.offenZahl', { count: z.offen })})</span>
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
      })}
    </ul>
  )
}
