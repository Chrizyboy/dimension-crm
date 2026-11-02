import { useNavigate } from '@tanstack/react-router'
import { CircleStop, ExternalLink, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { formatDatumZeit } from '@/lib/format'
import { istAppZiel } from '@/lib/ziel'
import { useLaufSteuerung, useWarum } from '@/services/automatik'
import { useUi } from '@/stores/ui'
import { StoppDialog } from './StoppDialog'

/**
 * «Warum?» neben einer Aufgabe aus einer Automation: welche Regel sie angelegt hat, ausgelöst wodurch und für
 * welchen Datensatz. Mitarbeitende sollen nicht rätseln, woher eine Aufgabe kommt, und können den Ablauf für
 * diesen Fall anhalten, statt die Aufgabe nur wegzuklicken.
 */
export function WarumKnopf({ laufId }: { laufId: string }) {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded text-xs underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        onClick={(e) => {
          e.stopPropagation()
          setOffen(true)
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
        }}
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
        {t('automatik.warum')}
      </button>
      {offen && (
        <WarumDialog
          laufId={laufId}
          onSchliessen={() => {
            setOffen(false)
          }}
        />
      )}
    </>
  )
}

function WarumDialog({ laufId, onSchliessen }: { laufId: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const navigate = useNavigate()
  const warum = useWarum(laufId, true)
  const steuerung = useLaufSteuerung()
  const [stopp, setStopp] = useState(false)
  const w = warum.data
  const name = w ? (sprache === 'fr' ? w.name_fr : w.name_de) : ''
  const offen = w && ['wartet', 'laeuft', 'server'].includes(w.stand)
  if (stopp && w) {
    return (
      <StoppDialog
        name={name}
        laeuft={steuerung.laeuft}
        onSchliessen={onSchliessen}
        onStoppen={(grund) => {
          void steuerung.stoppen(w.lauf_id, grund).then((ok) => {
            if (ok) onSchliessen()
          })
        }}
      />
    )
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('automatik.warumTitel')}
        fuss={
          w?.darf && offen ? (
            <Button
              variant="secondary"
              onClick={() => {
                setStopp(true)
              }}
            >
              <CircleStop />
              {t('automatik.stoppenFall')}
            </Button>
          ) : undefined
        }
      >
        {warum.isLoading && <Skelett className="h-24" />}
        {!warum.isLoading && !w && <p className="text-muted-foreground text-sm">{t('automatik.warumUnbekannt')}</p>}
        {w && (
          <div className="flex flex-col gap-3 text-sm" data-testid="warum">
            <p>
              {t('automatik.warumSatz', {
                name,
                ausloeser: t(`automationen.ereignis.${w.ausloeser.replace('.', '_')}`, { defaultValue: w.ausloeser }),
                zeit: formatDatumZeit(w.erstellt_am),
              })}
            </p>
            {(sprache === 'fr' ? w.beschreibung_fr : w.beschreibung_de) && (
              <p className="text-muted-foreground">{sprache === 'fr' ? w.beschreibung_fr : w.beschreibung_de}</p>
            )}
            {w.titel && (
              <p>
                {t('automatik.fuer')} <span className="font-medium">{w.titel}</span>
              </p>
            )}
            {w.ziel && istAppZiel(w.ziel) && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => {
                  onSchliessen()
                  void navigate({ href: w.ziel ?? '/' })
                }}
              >
                <ExternalLink />
                {t('automatik.datensatzOeffnen')}
              </Button>
            )}
            <p className="text-muted-foreground text-xs">{t('automatik.warumHinweis')}</p>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
