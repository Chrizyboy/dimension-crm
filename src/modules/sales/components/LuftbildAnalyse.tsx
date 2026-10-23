import { useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { rufeKi, useKiNachher } from '@/services/ki'
import { useLuftbildAnalyse } from '../hooks/useLuftbildAnalyse'
import { useUi } from '@/stores/ui'

const TON: Record<string, 'ok' | 'info' | 'warnung' | 'kritisch'> = {
  'sehr gut': 'ok',
  gut: 'info',
  mässig: 'warnung',
  ungeeignet: 'kritisch',
}

/**
 * Luftbild mit KI auswerten (V233 «Luftbild analysieren»): Dachform, Flächen mit Ausrichtung und Eignung,
 * Hindernisse und Verschattung. Nur eine Einschätzung aus dem Bild; die Besichtigung vor Ort entscheidet.
 */
export function LuftbildAnalyse({ leadId, dokumentId }: { leadId: string; dokumentId: string | null }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const qc = useQueryClient()
  const nachher = useKiNachher()
  const gespeichert = useLuftbildAnalyse(leadId)
  const [laeuft, setLaeuft] = useState(false)

  async function analysieren() {
    if (!dokumentId) return
    setLaeuft(true)
    try {
      await rufeKi('luftbild', { verkaufschance_id: leadId, dokument_id: dokumentId, sprache })
      await qc.invalidateQueries({ queryKey: ['ki', 'ergebnis', 'luftbild', leadId] })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
      nachher()
    }
  }

  const a = gespeichert.data?.inhalt
  return (
    <div className="flex flex-col gap-2" data-testid="luftbild-analyse">
      {a && (
        <div className="bg-surface-2 flex flex-col gap-2 rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{a.dachform}</span>
            {a.first_grad !== null && (
              <span className="text-muted-foreground text-xs">{t('ki.luftbild.first', { grad: a.first_grad })}</span>
            )}
            <Badge>{t(`verkauf.besichtigung.richtung.${a.ausrichtung}`)}</Badge>
            <span className="text-muted-foreground text-xs">{t(`ki.bewertung.sicherheit.${a.sicherheit}`)}</span>
          </div>
          <ul className="flex flex-col gap-1">
            {a.flaechen.map((f) => (
              <li key={`${f.ausrichtung}-${f.azimut}`} className="flex flex-wrap items-center gap-2">
                <span>{f.ausrichtung}</span>
                <span className="text-muted-foreground zahlen text-xs">{f.azimut}°</span>
                <span className="text-muted-foreground text-xs">{f.anteil}</span>
                <Badge ton={TON[f.eignung] ?? 'neutral'}>{f.eignung}</Badge>
              </li>
            ))}
          </ul>
          {a.hindernisse.length > 0 && (
            <p className="text-xs">
              <span className="text-muted-foreground">{t('ki.luftbild.hindernisse')}: </span>
              {a.hindernisse.join(', ')}
            </p>
          )}
          {a.verschattung && (
            <p className="text-xs">
              <span className="text-muted-foreground">{t('ki.luftbild.verschattung')}: </span>
              {a.verschattung}
            </p>
          )}
          {a.bemerkung && <p className="text-muted-foreground text-xs">{a.bemerkung}</p>}
        </div>
      )}
      <Button
        size="sm"
        variant="secondary"
        className="self-start"
        laedt={laeuft}
        disabled={!dokumentId}
        onClick={() => void analysieren()}
      >
        <Sparkles />
        {a ? t('ki.neu') : t('ki.luftbild.knopf')}
      </Button>
    </div>
  )
}
