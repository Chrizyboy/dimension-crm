import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAktion } from '../hooks/useAktion'
import { useBetrachter } from '../hooks/usePosteingang'
import { zuweisen } from '../services/posteingang'
import type { Mail } from '../types'

/**
 * Für wer verteilt: Mail aus info@, noch nicht weitergegeben. Zeigt den Vorschlag (Regel, Betreuer der Akte, Service,
 * Verkauf nach Zuständigkeiten) mit einem Knopf; daneben «Andere Person» und «Selbst übernehmen».
 */
export function VerteilenHinweis({ m, onAndere }: { m: Mail; onAndere: () => void }) {
  const { t } = useTranslation()
  const b = useBetrachter()
  const { laeuft, aus } = useAktion()
  if (!b.verteile || m.postfach_person_id !== null || m.verteilt_am !== null) return null
  if (!['neu', 'offen', 'info'].includes(m.stand)) return null
  return (
    <div className="border-accent bg-accent-soft my-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2.5">
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm font-semibold">
          {m.vorschlag_id && m.vorschlag
            ? t('posteingang.verteilen.an', { name: m.vorschlag })
            : t('posteingang.verteilen.ohneVorschlag')}
        </p>
        <p className="text-accent-ink text-xs">{t('posteingang.verteilen.text')}</p>
      </div>
      {m.vorschlag_id && (
        <Button
          size="sm"
          laedt={laeuft}
          onClick={() => void aus(() => zuweisen(m.id, m.vorschlag_id ?? ''), { de: 'Verteilt', fr: 'Attribué' })}
        >
          {t('posteingang.verteilen.knopf')}
        </Button>
      )}
      <Button size="sm" variant="secondary" onClick={onAndere}>
        {t('posteingang.verteilen.andere')}
      </Button>
      {b.ich && (
        <Button
          size="sm"
          variant="ghost"
          laedt={laeuft}
          onClick={() => void aus(() => zuweisen(m.id, b.ich ?? ''), { de: 'Übernommen', fr: 'Pris en charge' })}
        >
          {t('posteingang.verteilen.selbst')}
        </Button>
      )}
    </div>
  )
}
