import { CircleStop, ListChecks, Play, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatDatumZeit } from '@/lib/format'
import { zielVon } from '@/lib/ziel'
import { useAktion } from '../hooks/useAutomationen'
import { OFFEN, STAND_TON } from '../lib/anzeige'
import { laufAbbrechen } from '../services/automationen'
import type { Automation, Lauf, ProtokollEintrag } from '../types'
import { AKTION_ICON } from './symbole'
import { meldungText } from './texte'
import { ZielLink } from './ZielLink'

const ERGEBNIS_TON = {
  ok: 'ok',
  fehler: 'kritisch',
  uebersprungen: 'neutral',
  wartet: 'marke',
  server: 'info',
} as const

function symbol(art: string): LucideIcon {
  if (art === 'bedingungen') return ListChecks
  if (art === 'ende') return CircleStop
  return (AKTION_ICON as Partial<Record<string, LucideIcon>>)[art] ?? Play
}

/** Ein Lauf Schritt für Schritt: was geprüft, getan, übersprungen wurde und warum. */
export function LaufDetail({
  lauf,
  automation,
  onSchliessen,
}: {
  lauf: Lauf
  automation: Automation | undefined
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const bezug = zielVon(lauf.tabelle, lauf.bezug_id)
  const artText = (e: ProtokollEintrag) =>
    e.art === 'bedingungen' || e.art === 'ende'
      ? t(`automationen.schritt.${e.art}`)
      : t(`automationen.aktion.${e.art}`, { defaultValue: e.art })
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={lauf.titel ?? t('automationen.protokoll.ohneTitel')}
        beschreibung={automation?.name_de ?? ''}
        fuss={
          OFFEN.includes(lauf.stand) ? (
            <Button
              variant="secondary"
              disabled={laeuft}
              onClick={() => {
                void aus(() => laufAbbrechen(lauf.id), { de: 'Lauf beendet', fr: 'Exécution arrêtée' }).then(
                  onSchliessen,
                )
              }}
            >
              <CircleStop />
              {t('automationen.protokoll.abbrechen')}
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge ton={STAND_TON[lauf.stand]} punkt>
              {t(`automationen.stand.${lauf.stand}`)}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {t('automationen.protokoll.gestartet', { zeit: formatDatumZeit(lauf.erstellt_am) })}
            </span>
            {lauf.stand === 'wartet' && (
              <span className="text-muted-foreground text-xs">
                {t('automationen.protokoll.weiterAm', { zeit: formatDatumZeit(lauf.weiter_am) })}
              </span>
            )}
            {bezug && <ZielLink ziel={bezug}>{t('automationen.protokoll.bezugOeffnen')}</ZielLink>}
          </div>
          <ol className="flex flex-col gap-0" data-testid="protokoll">
            {lauf.protokoll.map((e, i) => {
              const Icon = symbol(e.art)
              return (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className="bg-muted relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  {i < lauf.protokoll.length - 1 && (
                    <span className="bg-border absolute top-7 bottom-0 left-3.5 w-px" aria-hidden="true" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{artText(e)}</span>
                      <Badge ton={ERGEBNIS_TON[e.ergebnis]}>{t(`automationen.ergebnis.${e.ergebnis}`)}</Badge>
                    </span>
                    {meldungText(t, e) && (
                      <span className="text-muted-foreground text-xs break-words">{meldungText(t, e)}</span>
                    )}
                    <span className="text-muted-foreground text-[11px]">{formatDatumZeit(e.zeit)}</span>
                    {e.ziel && <ZielLink ziel={e.ziel}>{t('automationen.protokoll.oeffnen')}</ZielLink>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
