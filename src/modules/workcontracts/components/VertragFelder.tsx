import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { positionText } from '../lib/positionen'
import type { OffertPosition, VertragAngaben } from '../types'
import { ZieleFeld } from './ZieleFeld'

/**
 * Was im Dokument steht: Art (Werkvertrag oder Auftragsbestätigung), Zeile unter den Parteien, Material,
 * Montagetermin, Positionen der Offerte (Optionen ankreuzen, was bestellt ist), Kundenziele, Bemerkungen und
 * Zusätzliches. Leere Felder nehmen den Vorschlag (grau im Feld), damit man nur Abweichungen tippt.
 */
export function VertragFelder({
  angaben: a,
  vorschlag,
  positionen = [],
  onChange,
}: {
  angaben: VertragAngaben
  vorschlag: { gegenstand: string; material: string }
  positionen?: readonly OffertPosition[]
  onChange: (a: VertragAngaben) => void
}) {
  const { t, i18n } = useTranslation()
  const fr = i18n.language === 'fr'
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
  const gewaehlt = new Set(a.gewaehlt ?? [])
  const optionale = positionen.filter((p) => p.optional)
  return (
    <div className="flex flex-col gap-4">
      <Feld
        id="vertrag-art"
        label={t('werkvertraege.felder.art')}
        hinweis={t(`werkvertraege.felder.artHinweis.${a.art ?? 'werkvertrag'}`)}
      >
        <Auswahl
          id="vertrag-art"
          value={a.art ?? 'werkvertrag'}
          onValueChange={(v) => {
            onChange({ ...a, art: v === 'auftragsbestaetigung' ? 'auftragsbestaetigung' : 'werkvertrag' })
          }}
          optionen={[
            { wert: 'werkvertrag', text: t('werkvertraege.art.werkvertrag') },
            { wert: 'auftragsbestaetigung', text: t('werkvertraege.art.auftragsbestaetigung') },
          ]}
        />
      </Feld>
      <div className="grid gap-4 sm:grid-cols-2">
        {text('gegenstand', 'vertrag-gegenstand', vorschlag.gegenstand)}
        {text('material', 'vertrag-material', vorschlag.material || t('werkvertraege.felder.materialLeer'))}
        {text('beginn', 'vertrag-beginn', t('werkvertraege.felder.nachAbsprache'))}
        {text('fertig', 'vertrag-fertig', t('werkvertraege.felder.nachAbsprache'))}
      </div>
      {positionen.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-muted-foreground pb-1 text-xs font-medium">
            {t('werkvertraege.felder.positionen', { anzahl: positionen.length })}
          </legend>
          <ul className="text-sm">
            {positionen
              .filter((p) => !p.optional)
              .map((p) => (
                <li key={p.bezeichnung} className="py-0.5">
                  {positionText(p, fr)}
                </li>
              ))}
          </ul>
          {optionale.length > 0 && (
            <div className="flex flex-col gap-1 pt-2">
              <p className="text-muted-foreground text-xs">{t('werkvertraege.felder.optionaleHinweis')}</p>
              {optionale.map((p) => (
                <label key={p.bezeichnung} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={gewaehlt.has(p.bezeichnung)}
                    onCheckedChange={(an) => {
                      const neu = new Set(gewaehlt)
                      if (an === true) neu.add(p.bezeichnung)
                      else neu.delete(p.bezeichnung)
                      onChange({ ...a, gewaehlt: [...neu] })
                    }}
                  />
                  {positionText(p, fr)}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}
      <ZieleFeld
        ziele={a.ziele ?? []}
        onChange={(ziele) => {
          onChange({ ...a, ziele })
        }}
      />
      <Feld id="vertrag-bemerkungen" label={t('werkvertraege.felder.bemerkungen')}>
        <Textarea
          id="vertrag-bemerkungen"
          rows={2}
          value={a.bemerkungen ?? ''}
          onChange={(e) => {
            onChange({ ...a, bemerkungen: e.target.value })
          }}
        />
      </Feld>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-muted-foreground pb-1 text-xs font-medium">{t('werkvertraege.felder.optionen')}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {option('monitoring')}
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
