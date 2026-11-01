import { useTranslation } from 'react-i18next'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import type { VertragAngaben } from '../types'

/**
 * Was im Vertrag steht (Vorlage Muri): Zeile unter den Parteien, Material, Termine und die Optionen zum
 * Ankreuzen. Leere Felder nehmen den Vorschlag (grau im Feld), damit man nur Abweichungen tippt.
 */
export function VertragFelder({
  angaben: a,
  vorschlag,
  batterie,
  onChange,
}: {
  angaben: VertragAngaben
  vorschlag: { gegenstand: string; material: string }
  batterie: boolean
  onChange: (a: VertragAngaben) => void
}) {
  const { t } = useTranslation()
  const text = (k: 'gegenstand' | 'material' | 'beginn' | 'fertig', id: string, platzhalter: string) => (
    <Feld id={id} label={t(`werkvertraege.felder.${k}`)}>
      <Input
        id={id}
        value={a[k] ?? ''}
        placeholder={platzhalter}
        onChange={(e) => {
          onChange({ ...a, [k]: e.target.value })
        }}
      />
    </Feld>
  )
  const option = (k: 'monitoring' | 'wartung') => (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={a.optionen?.[k] === true}
        onCheckedChange={(an) => {
          onChange({ ...a, optionen: { ...a.optionen, [k]: an === true } })
        }}
      />
      {t(`werkvertraege.felder.${k}`)}
    </label>
  )
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {text('gegenstand', 'vertrag-gegenstand', vorschlag.gegenstand)}
        {text('material', 'vertrag-material', vorschlag.material || t('werkvertraege.felder.materialLeer'))}
        {text('beginn', 'vertrag-beginn', t('werkvertraege.felder.nachAbsprache'))}
        {text('fertig', 'vertrag-fertig', t('werkvertraege.felder.nachAbsprache'))}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-muted-foreground pb-1 text-xs font-medium">{t('werkvertraege.felder.optionen')}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {option('monitoring')}
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            <Checkbox checked={batterie} disabled />
            {t('werkvertraege.felder.batterie')}
          </label>
          {option('wartung')}
        </div>
        <Feld id="vertrag-divers" label={t('werkvertraege.felder.divers')}>
          <Input
            id="vertrag-divers"
            value={a.optionen?.divers ?? ''}
            onChange={(e) => {
              onChange({ ...a, optionen: { ...a.optionen, divers: e.target.value } })
            }}
          />
        </Feld>
      </fieldset>
    </div>
  )
}
