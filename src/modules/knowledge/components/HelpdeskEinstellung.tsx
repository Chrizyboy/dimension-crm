import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Switch } from '@/components/ui/schalter'
import { useAktion, useHelpdeskStand } from '../hooks/useHandbuch'
import { helpdeskEinstellen } from '../services/meldungen'

const NIEMAND = 'niemand'

/**
 * Wer über Meldungen entscheidet und ob dazu eine SMS kommt (nur Administration). Ohne Wahl sehen alle aus der
 * Administration die Einschätzung in der Glocke und jede kann entscheiden.
 */
export function HelpdeskEinstellung() {
  const { t } = useTranslation()
  const stand = useHelpdeskStand(true)
  const { laeuft, aus } = useAktion()
  if (!stand.data) return null
  const s = stand.data
  const gewaehlt = s.kandidaten.find((k) => k.id === s.entscheider_person_id)
  const speichern = (person: string | null, sms: boolean) =>
    void aus(() => helpdeskEinstellen(person, sms), { de: 'Gespeichert', fr: 'Enregistré' })

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
      <span className="font-medium">{t('handbuch.meldungen.entscheidet')}</span>
      <Auswahl
        aria-label={t('handbuch.meldungen.entscheidet')}
        className="sm:w-56"
        disabled={laeuft}
        value={s.entscheider_person_id ?? NIEMAND}
        onValueChange={(w) => {
          speichern(w === NIEMAND ? null : w, s.sms)
        }}
        optionen={[
          { wert: NIEMAND, text: t('handbuch.meldungen.alleAdmins') },
          ...s.kandidaten.map((k) => ({ wert: k.id, text: k.name })),
        ]}
      />
      <label className="flex items-center gap-2">
        <Switch
          checked={s.sms}
          disabled={laeuft || !gewaehlt}
          onCheckedChange={(sms) => {
            speichern(s.entscheider_person_id, sms)
          }}
        />
        {t('handbuch.meldungen.perSms')}
      </label>
      {gewaehlt && !gewaehlt.mobil && s.sms && (
        <span className="text-warn">{t('handbuch.meldungen.keinMobil', { name: gewaehlt.name })}</span>
      )}
    </div>
  )
}
