import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useUi } from '@/stores/ui'
import { usePruefpunkte } from '../hooks/useBaustelle'
import type { Rapport, RapportEingabe } from '../types'

/** IBN-Protokoll: die Prüfpunkte aus den Einstellungen, Ja/Nein oder Messwert mit Einheit. */
export function PruefAbschnitt({
  rapport: r,
  offen,
  onAendern,
}: {
  rapport: Rapport
  offen: boolean
  onAendern: (e: RapportEingabe) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const punkte = usePruefpunkte()
  const werte = r.pruefpunkte
  const erledigt = (punkte.data ?? []).filter((p) => werte[p.schluessel] != null && werte[p.schluessel] !== '').length
  const setze = (schluessel: string, wert: string | boolean | null) => {
    // Nur den einen Punkt senden: die Datenbank führt zusammen, ein veralteter Stand überschreibt nichts.
    onAendern({ pruefpunkte: { [schluessel]: wert } })
  }

  return (
    <AkteAbschnitt
      titel={t('baustelle.ibn.titel')}
      zusatz={`${String(erledigt)} / ${String(punkte.data?.length ?? 0)}`}
    >
      <ul className="flex flex-col divide-y">
        {(punkte.data ?? []).map((p) => {
          const id = `pp-${p.schluessel}`
          const text = sprache === 'fr' ? p.fr : p.de
          return (
            <li key={p.schluessel} className="flex items-center justify-between gap-3 py-2 text-sm">
              <label htmlFor={id} className="min-w-0">
                {text}
              </label>
              {p.art === 'ja_nein' ? (
                <Switch
                  id={id}
                  disabled={!offen}
                  checked={werte[p.schluessel] === true}
                  onCheckedChange={(v) => {
                    setze(p.schluessel, v)
                  }}
                />
              ) : (
                <span className="flex shrink-0 items-center gap-1">
                  <Input
                    id={id}
                    inputMode="decimal"
                    className="w-24 text-right"
                    disabled={!offen}
                    defaultValue={typeof werte[p.schluessel] === 'string' ? (werte[p.schluessel] as string) : ''}
                    onBlur={(e) => {
                      if (e.target.value !== (werte[p.schluessel] ?? '')) setze(p.schluessel, e.target.value || null)
                    }}
                  />
                  <span className="text-muted-foreground w-8 text-xs">{p.einheit}</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </AkteAbschnitt>
  )
}
