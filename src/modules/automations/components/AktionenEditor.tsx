import { ArrowDown, ArrowUp, Plus, Send, Server, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { neueAktion } from '../lib/anzeige'
import type { Aktion, Katalog, Modus } from '../types'
import { AktionFelder } from './AktionFelder'
import { AKTION_ICON } from './symbole'

interface Props {
  wert: Aktion[]
  katalog: Katalog
  felder: readonly string[]
  modus: Modus
  onChange: (a: Aktion[]) => void
}

/** Aktionen der Reihe nach; «Warten» hält den Lauf an, «Prüfen» beendet ihn, wenn sich die Sache erledigt hat. */
export function AktionenEditor({ wert, katalog, felder, modus, onChange }: Props) {
  const { t } = useTranslation()
  const schiebe = (i: number, um: -1 | 1) => {
    const neu = [...wert]
    const [x] = neu.splice(i, 1)
    if (x) neu.splice(i + um, 0, x)
    onChange(neu)
  }
  return (
    <ol className="flex flex-col gap-2">
      {wert.map((a, i) => {
        const k = katalog.aktionen.find((x) => x.art === a.art)
        const Icon = AKTION_ICON[a.art]
        return (
          <li key={i} className="bg-surface rounded-lg border p-3" data-testid="aktion">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-muted-foreground zahlen w-4 text-xs">{i + 1}</span>
              <Icon className="text-accent-ink size-4" aria-hidden="true" />
              <span className="text-sm font-medium">{t(`automationen.aktion.${a.art}`)}</span>
              {k?.nach_aussen && (
                <Badge ton={modus === 'automatisch' ? 'warnung' : 'info'}>
                  <Send />
                  {t(modus === 'automatisch' ? 'automationen.modus.automatisch' : 'automationen.mitFreigabe')}
                </Badge>
              )}
              {k?.server && (
                <Badge>
                  <Server />
                  {t('automationen.server')}
                </Badge>
              )}
              <span className="ml-auto flex">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === 0}
                  aria-label={t('automationen.editor.hoch')}
                  onClick={() => {
                    schiebe(i, -1)
                  }}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={i === wert.length - 1}
                  aria-label={t('automationen.editor.runter')}
                  onClick={() => {
                    schiebe(i, 1)
                  }}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('automationen.editor.aktionWeg')}
                  onClick={() => {
                    onChange(wert.filter((_, j) => j !== i))
                  }}
                >
                  <Trash2 />
                </Button>
              </span>
            </div>
            <p className="text-muted-foreground mb-2 text-xs">{t(`automationen.aktionHilfe.${a.art}`)}</p>
            <AktionFelder
              id={`aktion-${i}`}
              aktion={a}
              katalog={katalog}
              felder={felder}
              onChange={(neu) => {
                onChange(wert.map((x, j) => (j === i ? neu : x)))
              }}
            />
          </li>
        )
      })}
      <li>
        <Menue>
          <MenueAusloeser asChild>
            <Button variant="secondary" size="sm">
              <Plus />
              {t('automationen.editor.aktionDazu')}
            </Button>
          </MenueAusloeser>
          <MenueInhalt align="start" className="max-h-80 overflow-y-auto">
            {katalog.aktionen.map((k) => {
              const Icon = AKTION_ICON[k.art]
              return (
                <MenueEintrag
                  key={k.art}
                  onSelect={() => {
                    onChange([...wert, neueAktion(k.art)])
                  }}
                >
                  <Icon />
                  {t(`automationen.aktion.${k.art}`)}
                </MenueEintrag>
              )
            })}
          </MenueInhalt>
        </Menue>
      </li>
    </ol>
  )
}
