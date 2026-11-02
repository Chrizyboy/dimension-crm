import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { useAktion, useAutomationsEinstellungen } from '../hooks/useAutomationen'
import { feiertageLesen } from '../lib/schutz'
import { speichereEinstellungen } from '../services/automationen'
import type { AutomationsEinstellungen, Versandfenster } from '../types'

const ZAHLEN = ['kontakt_pause_tage', 'lead_ohne_kontakt_tage', 'garantie_vorlauf_tage'] as const
const STANDARD: Versandfenster = { tage: [1, 2, 3, 4, 5], von: '08:00', bis: '18:00' }

/**
 * Schutz für Kunden, für alle Automationen gleich: Nachrichten nur im Versandfenster, höchstens eine pro
 * Kontakt-Pause, Feiertage zählen nicht als Arbeitstage. Eine Automation kann es für sich anders einstellen.
 */
export function Schutzregeln() {
  const abfrage = useAutomationsEinstellungen()
  if (!abfrage.data) return <Skelett className="h-64" />
  return <Formular start={abfrage.data} />
}

function Formular({ start }: { start: AutomationsEinstellungen }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [f, setF] = useState<Versandfenster>(start.versandfenster ?? STANDARD)
  const [zahlen, setZahlen] = useState({
    kontakt_pause_tage: start.kontakt_pause_tage ?? 3,
    lead_ohne_kontakt_tage: start.lead_ohne_kontakt_tage ?? 5,
    garantie_vorlauf_tage: start.garantie_vorlauf_tage ?? 60,
  })
  const [feiertage, setFeiertage] = useState((start.feiertage ?? []).map((d) => formatDatum(d)).join('\n'))
  const gelesen = feiertageLesen(feiertage)
  const tage = f.tage ?? []
  const zeitFalsch = (f.von ?? '') >= (f.bis ?? '')
  return (
    <Karte className="max-w-2xl">
      <KarteKopf>
        <KarteTitel className="flex items-center gap-2">
          <ShieldCheck className="text-ok size-4" aria-hidden="true" />
          {t('automationen.schutz.titel')}
        </KarteTitel>
      </KarteKopf>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-muted-foreground text-sm">{t('automationen.schutz.text')}</p>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium">{t('automationen.schutz.fenster')}</legend>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((tag) => (
              <label key={tag} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={tage.includes(tag)}
                  onCheckedChange={(an) => {
                    setF({ ...f, tage: an === true ? [...tage, tag].sort() : tage.filter((x) => x !== tag) })
                  }}
                />
                {t(`automationen.schutz.tag.${tag}`)}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Feld id="schutz-von" label={t('automationen.schutz.von')}>
              <Input
                id="schutz-von"
                type="time"
                className="w-36"
                value={f.von ?? ''}
                onChange={(e) => {
                  setF({ ...f, von: e.target.value })
                }}
              />
            </Feld>
            <Feld
              id="schutz-bis"
              label={t('automationen.schutz.bis')}
              fehler={zeitFalsch ? t('automationen.schutz.zeitFalsch') : undefined}
            >
              <Input
                id="schutz-bis"
                type="time"
                className="w-36"
                value={f.bis ?? ''}
                aria-invalid={zeitFalsch}
                onChange={(e) => {
                  setF({ ...f, bis: e.target.value })
                }}
              />
            </Feld>
          </div>
          <p className="text-muted-foreground text-xs">{t('automationen.schutz.fensterHilfe')}</p>
        </fieldset>
        {ZAHLEN.map((k) => (
          <Feld
            key={k}
            id={`schutz-${k}`}
            label={t(`automationen.schutz.${k}`)}
            hinweis={t(`automationen.schutz.${k}_hilfe`)}
          >
            <Input
              id={`schutz-${k}`}
              type="number"
              min={0}
              max={365}
              className="w-28"
              value={zahlen[k]}
              onChange={(e) => {
                setZahlen({ ...zahlen, [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) })
              }}
            />
          </Feld>
        ))}
        <Feld
          id="schutz-feiertage"
          label={t('automationen.schutz.feiertage')}
          hinweis={t('automationen.schutz.feiertageHilfe', { count: gelesen.daten.length })}
          fehler={
            gelesen.falsch.length
              ? t('automationen.schutz.feiertageFalsch', { liste: gelesen.falsch.join(', ') })
              : undefined
          }
        >
          <Textarea
            id="schutz-feiertage"
            className="min-h-28 font-mono"
            value={feiertage}
            aria-invalid={gelesen.falsch.length > 0}
            onChange={(e) => {
              setFeiertage(e.target.value)
            }}
          />
        </Feld>
        <Button
          className="self-start"
          disabled={laeuft || zeitFalsch || tage.length === 0 || gelesen.falsch.length > 0}
          onClick={() =>
            void aus(() => speichereEinstellungen({ versandfenster: f, ...zahlen, feiertage: gelesen.daten }), {
              de: 'Schutzregeln gespeichert',
              fr: 'Règles de protection enregistrées',
            })
          }
        >
          {t('allgemein.speichern')}
        </Button>
      </div>
    </Karte>
  )
}
