import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { aktionsFelder } from '../lib/anzeige'
import type { Aktion, Katalog } from '../types'
import { BedingungenEditor } from './BedingungenEditor'
import { EmpfaengerWahl } from './EmpfaengerWahl'
import { ZweisprachigFeld } from './ZweisprachigFeld'

interface Props {
  id: string
  aktion: Aktion
  katalog: Katalog
  /** Felder des Auslösers (für «Prüfen»). */
  felder: readonly string[]
  onChange: (a: Aktion) => void
}

/** Die Angaben einer Aktion, je nach Art (Empfänger, Texte, Tage …). */
export function AktionFelder({ id, aktion: a, katalog, felder, onChange }: Props) {
  const { t } = useTranslation()
  const f = aktionsFelder(a.art)
  const zahl = (v: string) => Math.max(0, Math.round(Number(v) || 0))
  return (
    <div className="flex flex-col gap-3">
      {f.an && (
        <EmpfaengerWahl
          id={`${id}-an`}
          label={t('automationen.editor.an')}
          wert={a.an ?? []}
          moeglich={katalog.empfaenger}
          onChange={(an) => {
            onChange({ ...a, an })
          }}
        />
      )}
      {f.absender && (
        <EmpfaengerWahl
          id={`${id}-absender`}
          label={t('automationen.editor.absender')}
          wert={a.absender ?? ['zustaendig']}
          moeglich={katalog.empfaenger}
          onChange={(absender) => {
            onChange({ ...a, absender })
          }}
        />
      )}
      {f.betreff && (
        <ZweisprachigFeld
          id={`${id}-betreff`}
          label={t('automationen.editor.betreff')}
          wert={a.betreff}
          platzhalter={katalog.platzhalter}
          onChange={(betreff) => {
            onChange({ ...a, betreff })
          }}
        />
      )}
      {f.titel && (
        <ZweisprachigFeld
          id={`${id}-titel`}
          label={t('automationen.editor.titel')}
          wert={a.titel}
          platzhalter={katalog.platzhalter}
          onChange={(titel) => {
            onChange({ ...a, titel })
          }}
        />
      )}
      {f.text && (
        <ZweisprachigFeld
          id={`${id}-text`}
          label={t('automationen.editor.text')}
          wert={a.text}
          mehrzeilig={a.art !== 'benachrichtigung'}
          platzhalter={katalog.platzhalter}
          onChange={(text) => {
            onChange({ ...a, text })
          }}
        />
      )}
      <div className="flex flex-wrap gap-3">
        {f.faellig && (
          <Feld id={`${id}-faellig`} label={t('automationen.editor.faelligTage')} className="w-36">
            <Input
              id={`${id}-faellig`}
              type="number"
              min={0}
              value={a.faellig_tage ?? 0}
              onChange={(e) => {
                onChange({ ...a, faellig_tage: zahl(e.target.value) })
              }}
            />
          </Feld>
        )}
        {f.tage && (
          <Feld id={`${id}-tage`} label={t('automationen.editor.tage')} className="w-36">
            <Input
              id={`${id}-tage`}
              type="number"
              min={1}
              value={a.tage ?? 1}
              onChange={(e) => {
                onChange({ ...a, tage: Math.max(1, zahl(e.target.value)) })
              }}
            />
          </Feld>
        )}
        {f.stufe && (
          <Feld id={`${id}-stufe`} label={t('automationen.editor.stufe')} className="w-40">
            <Auswahl
              id={`${id}-stufe`}
              value={a.stufe ?? 'info'}
              optionen={(['info', 'ok', 'warnung', 'kritisch'] as const).map((s) => ({
                wert: s,
                text: t(`automationen.stufe.${s}`),
              }))}
              onValueChange={(s) => {
                onChange({ ...a, stufe: s as NonNullable<Aktion['stufe']> })
              }}
            />
          </Feld>
        )}
        {f.tranche && (
          <Feld id={`${id}-tranche`} label={t('automationen.editor.tranche')} className="w-52">
            <Auswahl
              id={`${id}-tranche`}
              value={a.tranche ?? 'erste'}
              optionen={(['erste', 'letzte'] as const).map((s) => ({ wert: s, text: t(`automationen.tranche.${s}`) }))}
              onValueChange={(s) => {
                onChange({ ...a, tranche: s as 'erste' | 'letzte' })
              }}
            />
          </Feld>
        )}
        {f.merkmal && (
          <Feld id={`${id}-merkmal`} label={t('automationen.editor.merkmal')} className="w-52">
            <Auswahl
              id={`${id}-merkmal`}
              value={a.merkmal ?? ''}
              optionen={katalog.zielgruppen.map((z) => ({ wert: z, text: t(`automationen.zielgruppe.${z}`) }))}
              onValueChange={(merkmal) => {
                onChange({ ...a, merkmal })
              }}
            />
          </Feld>
        )}
      </div>
      {f.sende && (
        <Schalter
          id={`${id}-vortag`}
          text={t('automationen.editor.vortag')}
          an={a.sende === 'vortag_termin'}
          onChange={(an) => {
            const ohne: Aktion = { ...a }
            delete ohne.sende
            onChange(an ? { ...a, sende: 'vortag_termin' } : ohne)
          }}
        />
      )}
      {f.werbung && (
        <Schalter
          id={`${id}-werbung`}
          text={t('automationen.editor.werbung')}
          an={a.werbung === true}
          onChange={(werbung) => {
            onChange({ ...a, werbung })
          }}
        />
      )}
      {f.bedingungen && (
        <BedingungenEditor
          id={`${id}-pruefen`}
          wert={a.bedingungen ?? []}
          felder={felder}
          operatoren={katalog.operatoren}
          onChange={(bedingungen) => {
            onChange({ ...a, bedingungen })
          }}
        />
      )}
    </div>
  )
}

function Schalter({
  id,
  text,
  an,
  onChange,
}: {
  id: string
  text: string
  an: boolean
  onChange: (an: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <Switch id={id} checked={an} onCheckedChange={onChange} />
      {text}
    </label>
  )
}
