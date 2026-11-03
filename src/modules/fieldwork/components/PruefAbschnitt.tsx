import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { usePruefpunkte, useWartungPruefung } from '../hooks/useBaustelle'
import { abweichung } from '../lib/inspektion'
import type { Pruefpunkt, Rapport, RapportEingabe, Vorjahr } from '../types'

interface Props {
  rapport: Rapport
  offen: boolean
  onAendern: (e: RapportEingabe) => void
}

/** IBN-Protokoll: die Prüfpunkte aus den Einstellungen, Ja/Nein oder Messwert mit Einheit. */
export function PruefAbschnitt(p: Props) {
  const { t } = useTranslation()
  const punkte = usePruefpunkte()
  return <PruefListe {...p} titel={t('baustelle.ibn.titel')} punkte={punkte.data ?? []} />
}

/**
 * Inspektion eines Wartungsvertrags: Prüfpunkte nach Paket (Messungen nur mit Premium), daneben der Wert der letzten
 * Inspektion oder der IBN. Weicht ein Messwert mehr als die Schwelle ab, wird er markiert.
 */
export function WartungPruefAbschnitt(p: Props) {
  const { t } = useTranslation()
  const pruefung = useWartungPruefung(p.rapport.wartungsvertrag_id)
  return (
    <PruefListe
      {...p}
      titel={t('baustelle.inspektion.titel')}
      punkte={pruefung.data?.punkte ?? []}
      vorjahr={pruefung.data?.vorjahr ?? null}
      schwelle={pruefung.data?.abweichung_prozent ?? 10}
    />
  )
}

function PruefListe({
  rapport: r,
  offen,
  onAendern,
  titel,
  punkte,
  vorjahr = null,
  schwelle = 10,
}: Props & { titel: string; punkte: Pruefpunkt[]; vorjahr?: Vorjahr | null; schwelle?: number }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const werte = r.pruefpunkte
  const erledigt = punkte.filter((p) => werte[p.schluessel] != null && werte[p.schluessel] !== '').length
  const setze = (schluessel: string, wert: string | boolean | null) => {
    // Nur den einen Punkt senden: die Datenbank führt zusammen, ein veralteter Stand überschreibt nichts.
    onAendern({ pruefpunkte: { [schluessel]: wert } })
  }
  const vorher = (s: string) => {
    const w = vorjahr?.werte[s]
    return w == null || w === '' ? null : w
  }

  return (
    <AkteAbschnitt titel={titel} zusatz={`${String(erledigt)} / ${String(punkte.length)}`}>
      {vorjahr && (
        <p className="text-muted-foreground pb-1 text-xs">
          {t(`baustelle.inspektion.vorjahr.${vorjahr.quelle}`, { datum: formatDatum(vorjahr.datum) })}
        </p>
      )}
      <ul className="flex flex-col divide-y">
        {punkte.map((p) => {
          const id = `pp-${p.schluessel}`
          const text = sprache === 'fr' ? p.fr : p.de
          const alt = vorher(p.schluessel)
          const diff = p.art === 'wert' ? abweichung(werte[p.schluessel], alt, schwelle) : null
          return (
            <li key={p.schluessel} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="flex min-w-0 flex-col">
                <label htmlFor={id}>{text}</label>
                {p.art === 'wert' && alt != null && (
                  <span className="text-muted-foreground text-xs">
                    {t('baustelle.inspektion.letztes', { wert: `${String(alt)} ${p.einheit ?? ''}`.trim() })}
                  </span>
                )}
              </span>
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
                  {diff != null && (
                    <Badge ton="warnung" aria-label={t('baustelle.inspektion.abweichung', { prozent: diff })}>
                      {diff > 0 ? `+${String(diff)}` : String(diff)} %
                    </Badge>
                  )}
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
