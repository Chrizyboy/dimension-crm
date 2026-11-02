import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Switch } from '@/components/ui/schalter'
import type { AktionsFelder } from '../lib/anzeige'
import type { Aktion } from '../types'

/**
 * Zusätze einer Aktion (Entscheid 0039): Arbeitstage statt Kalendertage, was «Prüfen» bei «nicht mehr nötig» tut,
 * und eine Anruf-Aufgabe, wenn Mail oder Handynummer fehlt. Eigene Datei, damit AktionFelder klein bleibt.
 */
export function AktionZusatz({
  id,
  aktion: a,
  felder: f,
  onChange,
}: {
  id: string
  aktion: Aktion
  felder: AktionsFelder
  onChange: (a: Aktion) => void
}) {
  const { t } = useTranslation()
  const schalte = (k: 'arbeitstage' | 'ersatz_aufgabe', an: boolean) => {
    // Feld weglassen statt «false» speichern, damit gespeicherte Automationen schlank bleiben.
    const neu: Aktion = { ...a }
    if (k === 'arbeitstage') delete neu.arbeitstage
    else delete neu.ersatz_aufgabe
    onChange(an ? { ...neu, [k]: true } : neu)
  }
  return (
    <>
      {f.arbeitstage && (
        <label htmlFor={`${id}-arbeitstage`} className="flex items-center gap-2 text-sm">
          <Switch
            id={`${id}-arbeitstage`}
            checked={a.arbeitstage === true}
            onCheckedChange={(an) => {
              schalte('arbeitstage', an)
            }}
          />
          {t('automationen.editor.arbeitstage')}
        </label>
      )}
      {f.ersatz && (
        <label htmlFor={`${id}-ersatz`} className="flex items-center gap-2 text-sm">
          <Switch
            id={`${id}-ersatz`}
            checked={a.ersatz_aufgabe === true}
            onCheckedChange={(an) => {
              schalte('ersatz_aufgabe', an)
            }}
          />
          {t(a.art === 'sms' ? 'automationen.editor.ersatzSms' : 'automationen.editor.ersatzMail')}
        </label>
      )}
      {f.sonst && (
        <Feld id={`${id}-sonst`} label={t('automationen.editor.sonstWas')} className="max-w-sm">
          <Auswahl
            id={`${id}-sonst`}
            value={a.sonst ?? 'ende'}
            optionen={(['ende', 'ueberspringen'] as const).map((s) => ({
              wert: s,
              text: t(`automationen.editor.sonstArt.${s}`),
            }))}
            onValueChange={(s) => {
              const neu: Aktion = { ...a }
              if (s === 'ueberspringen') neu.sonst = 'ueberspringen'
              else delete neu.sonst
              onChange(neu)
            }}
          />
        </Feld>
      )}
    </>
  )
}
