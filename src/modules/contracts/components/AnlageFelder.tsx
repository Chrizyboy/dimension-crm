import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import type { KundenAnlage } from '../types'

/** Angaben zur Anlage wie im Auftragsformular der Website (Seite 3). */
export interface AnlageAngaben {
  anlage_id: string
  kwp: string
  speicher: string
  ibn: string
  wr: string
  ort: string
  fremd: boolean
}

/**
 * Anlage des Kunden wählen (füllt kWp, Inbetriebnahme und Wechselrichter aus Projekt und Anlage vor) oder von
 * Hand erfassen, z. B. bei Fremdanlagen.
 */
export function AnlageFelder({
  anlagen,
  wert: a,
  fehler,
  onChange,
}: {
  anlagen: KundenAnlage[]
  wert: AnlageAngaben
  fehler: Partial<Record<string, string>>
  onChange: (neu: AnlageAngaben, anlage?: KundenAnlage) => void
}) {
  const { t } = useTranslation()
  const feld = (k: string) => (fehler[k] ? { fehler: fehler[k] } : {})
  const text = (k: keyof AnlageAngaben, id: string, label: string, zahl = false) => (
    <Feld id={id} label={label} {...feld(k)}>
      <Input
        id={id}
        {...(zahl ? { inputMode: 'decimal' as const } : {})}
        value={String(a[k])}
        onChange={(e) => {
          onChange({ ...a, [k]: e.target.value })
        }}
      />
    </Feld>
  )
  return (
    <div className="flex flex-col gap-3">
      {anlagen.length > 0 && (
        <Feld id="wv-anlage" label={t('wartung.feld.anlage')}>
          <Auswahl
            id="wv-anlage"
            value={a.anlage_id || 'hand'}
            onValueChange={(id) => {
              const x = anlagen.find((n) => n.id === id)
              if (!x) {
                onChange({ ...a, anlage_id: '' })
                return
              }
              onChange(
                {
                  ...a,
                  anlage_id: x.id,
                  kwp: x.kwp != null ? String(x.kwp) : a.kwp,
                  ibn: x.ibn_jahr != null ? String(x.ibn_jahr) : a.ibn,
                  wr: x.wechselrichter ?? a.wr,
                  fremd: false,
                },
                x,
              )
            }}
            optionen={[
              ...anlagen.map((x) => ({
                wert: x.id,
                text: [x.projekt, x.kwp != null ? `${String(x.kwp)} kWp` : null, x.ort].filter(Boolean).join(' · '),
              })),
              { wert: 'hand', text: t('wartung.feld.ohneAnlage') },
            ]}
          />
        </Feld>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {text('kwp', 'wv-kwp', t('wartung.feld.kwp'), true)}
        {text('speicher', 'wv-speicher', t('wartung.feld.speicher'), true)}
        {text('ibn', 'wv-ibn', t('wartung.feld.ibn'), true)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {text('wr', 'wv-wr', t('wartung.feld.wr'))}
        {text('ort', 'wv-ort', t('wartung.feld.ort'))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={a.fremd}
          onCheckedChange={(c) => {
            onChange({ ...a, fremd: c === true })
          }}
        />
        {t('wartung.feld.fremd')}
      </label>
    </div>
  )
}
