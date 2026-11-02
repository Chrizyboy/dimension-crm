import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/feld'
import { Switch } from '@/components/ui/schalter'
import type { Recht } from '@/types/anmeldung'

/** Zusätze zur Rolle im Geschäft (Chris 2.11.2026): Geschäftsleitung und Administration. */
const ZUSAETZE: readonly Exclude<Recht, 'basis'>[] = ['gl', 'admin']
/** Einzelne Rechte, die man zusätzlich geben kann. «basis» hat jede aktive Person ohnehin. */
const WEITERE: readonly Exclude<Recht, 'basis'>[] = ['personal', 'finanzen', 'preise', 'planung', 'marge', 'visum']

interface RechteAuswahlProps {
  id: string
  wert: string[]
  onChange: (rechte: string[]) => void
  /** Rechte, die schon die Rolle mitbringt: angezeigt, aber nicht abwählbar. */
  vonRolle?: string[]
}

/** Schalter für die Zusätze (Geschäftsleitung, Administration) und die einzelnen Rechte. */
export function RechteAuswahl({ id, wert, onChange, vonRolle = [] }: RechteAuswahlProps) {
  const { t } = useTranslation()
  const schalter = (recht: Exclude<Recht, 'basis'>) => {
    const ausRolle = vonRolle.includes(recht)
    const an = ausRolle || wert.includes(recht)
    return (
      <div key={recht} className="flex items-start gap-3">
        <Switch
          id={`${id}-${recht}`}
          checked={an}
          disabled={ausRolle}
          onCheckedChange={(neu) => {
            onChange(neu ? [...wert, recht] : wert.filter((r) => r !== recht))
          }}
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={`${id}-${recht}`}>{t(`rechte.${recht}`)}</Label>
          <span className="text-muted-foreground text-xs">
            {ausRolle ? t('rechte.ausRolle') : t(`rechte.${recht}Text`)}
          </span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold">{t('rechte.zusaetze')}</legend>
        {ZUSAETZE.map(schalter)}
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold">{t('rechte.weitere')}</legend>
        {WEITERE.map(schalter)}
      </fieldset>
    </div>
  )
}
