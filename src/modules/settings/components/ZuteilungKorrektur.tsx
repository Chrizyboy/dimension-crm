import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useIstAdmin } from '@/hooks/useIstAdmin'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { korrekturZuruecknehmen, ladeKorrektur } from '../services/zustaendigkeiten'

const BEREICHE = ['verkaufschancen', 'offerten', 'projekte', 'service_faelle', 'aufgaben'] as const

/**
 * Hinweis zur Korrektur vom 19.11.2026 (Zuteilung wie in der Vorlage): was umgeteilt wurde, und für die
 * Administration «Rückgängig» mit Rückfrage. Ohne Korrektur zeigt er nichts.
 */
export function Korrektur() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const admin = useIstAdmin()
  const [sicher, setSicher] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const n = useQuery({ queryKey: ['zuteilung', 'korrektur'], queryFn: ladeKorrektur })
  const zahlen = BEREICHE.filter((b) => (n.data?.[b] ?? 0) > 0)
  if (zahlen.length === 0) return null

  async function zuruecknehmen() {
    setLaeuft(true)
    try {
      const k = await korrekturZuruecknehmen()
      melde('ok', { de: `${String(k)} Zuteilungen zurückgesetzt`, fr: `${String(k)} attributions rétablies` })
      void qc.invalidateQueries({ queryKey: ['zuteilung', 'korrektur'] })
    } catch (f) {
      meldeFehler(f, 'zuteilung')
      melde('kritisch', { de: 'Nicht zurückgesetzt', fr: 'Non rétabli' })
    } finally {
      setLaeuft(false)
      setSicher(false)
    }
  }

  return (
    <section className="bg-surface-2 flex flex-col gap-2 rounded-xl p-3">
      <h3 className="font-medium">{t('zust.korrektur.titel')}</h3>
      <p className="text-muted-foreground text-xs">
        {t('zust.korrektur.text', {
          liste: zahlen.map((b) => t(`zust.korrektur.${b}`, { count: n.data?.[b] ?? 0 })).join(', '),
        })}
      </p>
      {admin && (
        <Button
          variant={sicher ? 'danger' : 'secondary'}
          size="sm"
          className="self-start"
          laedt={laeuft}
          onClick={() => {
            if (sicher) void zuruecknehmen()
            else setSicher(true)
          }}
        >
          <Undo2 />
          {sicher ? t('zust.korrektur.sicher') : t('zust.korrektur.rueckgaengig')}
        </Button>
      )}
    </section>
  )
}
