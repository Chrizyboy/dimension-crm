import { useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatDatumZeit } from '@/lib/format'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import {
  kiErgebnisSetzen,
  rufeKi,
  useKiErgebnis,
  useKiNachher,
  type KiBezug,
  type KiZusammenfassungInhalt,
} from '@/services/ki'
import { supabase } from '@/services/supabase'
import { useUi } from '@/stores/ui'

/**
 * Zusammenfassung auf Knopfdruck (Bau-Auftrag 3.4) für Kunde, Lead, Offerte, Projekt oder Service-Fall.
 * Die letzte bleibt gespeichert und ist für alle sichtbar; «Neu» kostet einen neuen Aufruf.
 */
export function KiZusammenfassung({ bezug }: { bezug: KiBezug }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const qc = useQueryClient()
  const nachher = useKiNachher()
  const gespeichert = useKiErgebnis('zusammenfassung', bezug)
  const [laeuft, setLaeuft] = useState(false)
  if (!supabase) return null

  async function erstellen() {
    setLaeuft(true)
    try {
      const r = await rufeKi<{ zusammenfassung: KiZusammenfassungInhalt }>('zusammenfassung', {
        tabelle: bezug.tabelle,
        id: bezug.id,
        sprache,
      })
      kiErgebnisSetzen(qc, 'zusammenfassung', bezug.id, r.zusammenfassung)
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
      nachher()
    }
  }

  const z = gespeichert.data
  return (
    <div className="flex flex-col gap-2" data-testid="ki-zusammenfassung">
      {z ? (
        <div className="bg-surface-2 flex flex-col gap-2 rounded-lg border p-3 text-sm">
          <p>{z.inhalt.kurz}</p>
          {z.inhalt.punkte.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5">
              {z.inhalt.punkte.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {z.inhalt.offen.length > 0 && (
            <div>
              <div className="text-muted-foreground text-xs font-medium">{t('ki.zusammenfassung.offen')}</div>
              <ul className="list-disc space-y-0.5 pl-5">
                {z.inhalt.offen.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {z.inhalt.naechster_schritt && (
            <p className="text-primary dark:text-accent font-medium">→ {z.inhalt.naechster_schritt}</p>
          )}
          <p className="text-muted-foreground text-[11px]">
            {t('ki.vorschlagVom', { datum: formatDatumZeit(z.erstellt_am) })}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t('ki.zusammenfassung.leer')}</p>
      )}
      <Button size="sm" variant="secondary" className="self-start" laedt={laeuft} onClick={() => void erstellen()}>
        <Sparkles />
        {z ? t('ki.neu') : t('ki.zusammenfassung.knopf')}
      </Button>
    </div>
  )
}
