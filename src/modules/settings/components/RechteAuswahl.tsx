import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/feld'
import { Switch } from '@/components/ui/schalter'
import type { Recht } from '@/types/anmeldung'

/** Rechte, die man einzeln geben kann. «basis» hat jede aktive Person ohnehin. */
const WAEHLBAR: readonly Exclude<Recht, 'basis'>[] = ['preise', 'finanzen', 'admin']

interface RechteAuswahlProps {
  id: string
  wert: string[]
  onChange: (rechte: string[]) => void
  /** Rechte, die schon die Rolle mitbringt: angezeigt, aber nicht abwählbar. */
  vonRolle?: string[]
}

/** Schalter für die Zusatzrechte Einkaufspreise, Finanzen und Administration. */
export function RechteAuswahl({ id, wert, onChange, vonRolle = [] }: RechteAuswahlProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      {WAEHLBAR.map((recht) => {
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
      })}
    </div>
  )
}
