import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { Label } from '@/components/ui/feld'
import { Checkbox } from '@/components/ui/schalter'
import { useUi } from '@/stores/ui'
import type { ModulMeta } from '@/types/modul'

interface BereicheAuswahlProps {
  id: string
  /** Alle Bereiche des CRM (kommt von der Seite, damit das Modul die Navigation nicht selbst importiert). */
  module: readonly ModulMeta[]
  wert: string[]
  onChange: (bereiche: string[]) => void
}

/**
 * Häkchen pro Bereich der Seitenleiste. Bereiche mit «immer» (z. B. Mein Tag) sind für alle da
 * und hier deshalb nicht wählbar; Bereiche mit eigenem Recht (Finanzen) zeigen das an.
 */
export function BereicheAuswahl({ id, module, wert, onChange }: BereicheAuswahlProps) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const waehlbar = module.filter((m) => !m.immer && m.recht !== 'admin')
  return (
    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
      {waehlbar.map((m) => {
        const feld = `${id}-${m.id}`
        return (
          <div key={m.id} className="flex items-center gap-2">
            <Checkbox
              id={feld}
              checked={wert.includes(m.id)}
              onCheckedChange={(an) => {
                onChange(an === true ? [...wert, m.id] : wert.filter((b) => b !== m.id))
              }}
            />
            <Label htmlFor={feld} className="flex min-w-0 items-center gap-1.5 font-normal">
              <ModulIcon name={m.icon} className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate">{m.titel[sprache]}</span>
              {m.recht && <span className="text-muted-foreground text-[11px]">({t(`rechte.${m.recht}`)})</span>}
            </Label>
          </div>
        )
      })}
    </div>
  )
}
