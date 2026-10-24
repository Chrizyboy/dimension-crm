import { useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatumZeit } from '@/lib/format'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { kiErgebnisSetzen, rufeKi, useKiErgebnis, useKiNachher, type KiLeadBewertungInhalt } from '@/services/ki'
import { supabase } from '@/services/supabase'
import { useUi } from '@/stores/ui'

const TON = { hoch: 'ok', mittel: 'warnung', tief: 'neutral' } as const

/**
 * Lead-Bewertung mit Begründung (Bau-Auftrag 3.4): Abschlusschance, gestützt auf die eigenen Zahlen der letzten
 * zwei Jahre (Quelle, Region, Produkt). Nur ein Hinweis für die Reihenfolge, setzt nichts automatisch.
 */
export function KiLeadBewertung({ leadId }: { leadId: string }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const qc = useQueryClient()
  const nachher = useKiNachher()
  const bezug = { tabelle: 'verkaufschancen' as const, id: leadId }
  const gespeichert = useKiErgebnis('lead_bewertung', bezug)
  const [laeuft, setLaeuft] = useState(false)
  if (!supabase) return null

  async function bewerten() {
    setLaeuft(true)
    try {
      const r = await rufeKi<{ bewertung: KiLeadBewertungInhalt }>('lead_bewertung', {
        verkaufschance_id: leadId,
        sprache,
      })
      kiErgebnisSetzen(qc, 'lead_bewertung', leadId, r.bewertung)
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
      nachher()
    }
  }

  const b = gespeichert.data?.inhalt
  return (
    <div className="flex flex-col gap-2" data-testid="ki-lead-bewertung">
      {b ? (
        <div className="bg-surface-2 flex flex-col gap-2 rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="zahlen font-display text-2xl font-semibold">{b.wahrscheinlichkeit} %</span>
            <Badge ton={TON[b.stufe]}>{t(`ki.bewertung.stufe.${b.stufe}`)}</Badge>
            <span className="text-muted-foreground text-xs">{t(`ki.bewertung.sicherheit.${b.sicherheit}`)}</span>
          </div>
          <ul className="flex flex-col gap-1">
            {b.gruende.map((g) => (
              <li key={g.text} className="flex items-start gap-2">
                {g.richtung === 'plus' ? (
                  <Plus className="text-ok mt-0.5 size-3.5 shrink-0" aria-label={t('ki.bewertung.plus')} />
                ) : (
                  <Minus className="text-bad mt-0.5 size-3.5 shrink-0" aria-label={t('ki.bewertung.minus')} />
                )}
                {g.text}
              </li>
            ))}
          </ul>
          {b.naechster_schritt && <p className="text-primary dark:text-accent font-medium">→ {b.naechster_schritt}</p>}
          <p className="text-muted-foreground text-xs">
            {t('ki.vorschlagVom', { datum: formatDatumZeit(gespeichert.data?.erstellt_am) })}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t('ki.bewertung.leer')}</p>
      )}
      <Button size="sm" variant="secondary" className="self-start" laedt={laeuft} onClick={() => void bewerten()}>
        <Sparkles />
        {b ? t('ki.neu') : t('ki.bewertung.knopf')}
      </Button>
    </div>
  )
}
