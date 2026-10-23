import { Archive, Check, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/datum'
import { materialRappen } from '../lib/vorschau'
import { materialSpeichern } from '../services/finanzen'
import type { Finanzdaten, Material as MaterialTyp } from '../types'

/**
 * Material je Baustelle (V233 «Material»): Positionen beim Grosshändler mit EK, Transport, MWST und Stand.
 * Bezahlt wird oft vor dem Bautermin; ohne Datum rechnet die Vorschau mit Bautermin minus Vorlauf.
 */
export function Material({
  daten,
  onBearbeiten,
}: {
  daten: Finanzdaten
  onBearbeiten: (m: MaterialTyp | null) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const mwst = daten.einstellungen.mwst
  const liste = daten.material
    .filter((m) => !m.archiviert)
    .sort((a, b) => (a.zahlbar_bis ?? a.bautermin ?? '9').localeCompare(b.zahlbar_bis ?? b.bautermin ?? '9'))

  const positionBezahlt = (m: MaterialTyp, idx: number) =>
    void aus(
      () =>
        materialSpeichern(m.id, {
          positionen: m.positionen.map((p, i) =>
            i === idx ? { ...p, status: 'bezahlt', bezahltAm: heuteZuerich() } : p,
          ),
        }),
      { de: 'Als bezahlt markiert', fr: 'Marqué comme payé' },
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            onBearbeiten(null)
          }}
        >
          <Plus />
          {t('finanzen.material.neu')}
        </Button>
      </div>
      {liste.length === 0 && <p className="text-muted-foreground text-sm">{t('finanzen.material.leer')}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {liste.map((m) => {
          const offen = m.positionen
            .filter((p) => p.status !== 'bezahlt')
            .reduce((s, p) => s + materialRappen(p, mwst), 0)
          return (
            <Karte key={m.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{m.baustelle ?? '–'}</span>
                  <span className="text-muted-foreground text-xs">
                    {[
                      m.bautermin ? t('finanzen.material.bautermin', { datum: formatDatum(m.bautermin) }) : null,
                      m.zahlbar_bis ? t('finanzen.material.zahlbarBis', { datum: formatDatum(m.zahlbar_bis) }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || t('finanzen.ohneDatum')}
                  </span>
                </div>
                <span className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('finanzen.aktion.bearbeiten')}
                    onClick={() => {
                      onBearbeiten(m)
                    }}
                  >
                    <Pencil />
                  </Button>
                  {offen === 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('finanzen.material.archivieren')}
                      onClick={() => void aus(() => materialSpeichern(m.id, { archiviert: true }))}
                    >
                      <Archive />
                    </Button>
                  )}
                </span>
              </div>
              <ul className="divide-y text-sm">
                {m.positionen.map((p, i) => (
                  <li key={`${p.position}-${String(i)}`} className="flex items-center gap-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate">
                      {p.position}
                      {p.lieferant && <span className="text-muted-foreground ml-1 text-xs">· {p.lieferant}</span>}
                      {p.exkl && (
                        <span className="text-muted-foreground ml-1 text-xs">· {t('finanzen.material.exkl')}</span>
                      )}
                    </span>
                    <span className="zahlen w-24 text-right">{formatChf(materialRappen(p, mwst))}</span>
                    {p.status === 'bezahlt' ? (
                      <Badge ton="ok" className="w-20 justify-center">
                        {t('finanzen.bezahlt')}
                      </Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-20"
                        laedt={laeuft}
                        onClick={() => {
                          positionBezahlt(m, i)
                        }}
                      >
                        <Check />
                        {t('finanzen.aktion.bezahlt')}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">{t('finanzen.material.offen')}</span>
                <span className="zahlen font-semibold">{formatChf(offen, { mitWaehrung: true })}</span>
              </div>
            </Karte>
          )
        })}
      </div>
    </div>
  )
}
