import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/schalter'
import { useAktion, useHelpdeskStand } from '../hooks/useHandbuch'
import { helpdeskEinstellen } from '../services/meldungen'

/**
 * Wer über Meldungen entscheidet und ob dazu eine SMS kommt (nur Administration). Mehrere Personen sind möglich:
 * alle bekommen Glocke und SMS, wer zuerst entscheidet, gilt. Ohne Wahl sehen alle aus der Administration die
 * Einschätzung in der Glocke und jede kann entscheiden.
 */
export function HelpdeskEinstellung() {
  const { t } = useTranslation()
  const stand = useHelpdeskStand(true)
  const { laeuft, aus } = useAktion()
  if (!stand.data) return null
  const s = stand.data
  const gewaehlt = s.kandidaten.filter((k) => s.entscheider_person_ids.includes(k.id))
  const speichern = (personen: string[], sms: boolean) =>
    void aus(() => helpdeskEinstellen(personen, sms), { de: 'Gespeichert', fr: 'Enregistré' })

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="font-medium">{t('handbuch.meldungen.entscheidet')}</span>
        {s.kandidaten.map((k) => (
          <label key={k.id} className="flex items-center gap-2">
            <Switch
              checked={s.entscheider_person_ids.includes(k.id)}
              disabled={laeuft}
              onCheckedChange={(an) => {
                const ohne = s.entscheider_person_ids.filter((id) => id !== k.id)
                speichern(an ? [...ohne, k.id] : ohne, s.sms)
              }}
            />
            {k.name}
          </label>
        ))}
        <label className="flex items-center gap-2 sm:ml-auto">
          <Switch
            checked={s.sms}
            disabled={laeuft || gewaehlt.length === 0}
            onCheckedChange={(sms) => {
              speichern(s.entscheider_person_ids, sms)
            }}
          />
          {t('handbuch.meldungen.perSms')}
        </label>
      </div>
      {gewaehlt.length === 0 && <span className="text-muted-foreground">{t('handbuch.meldungen.alleAdmins')}</span>}
      {s.sms &&
        gewaehlt
          .filter((k) => !k.mobil)
          .map((k) => (
            <span key={k.id} className="text-warn">
              {t('handbuch.meldungen.keinMobil', { name: k.name })}
            </span>
          ))}
    </div>
  )
}
