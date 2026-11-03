import { useQuery } from '@tanstack/react-query'
import { ExternalLink, FileWarning } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { belegAdresse, belegZeigen } from '../services/spesen'
import type { Spese } from '../types'

/**
 * Beleg gross neben den Angaben (Prüfen): Bild direkt, PDF eingebettet, immer mit «In neuem Fenster».
 * Ohne Beleg ein deutlicher Hinweis statt einer leeren Fläche.
 */
export function BelegVorschau({ spese: s }: { spese: Spese }) {
  const { t } = useTranslation()
  const adresse = useQuery({
    queryKey: ['spesen', 'beleg', s.beleg_id],
    enabled: Boolean(s.beleg_id),
    staleTime: 4 * 60_000,
    queryFn: () => belegAdresse(s.beleg_id ?? ''),
  })

  if (!s.beleg_id) {
    return (
      <div className="bg-muted text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg p-6 text-center text-sm">
        <FileWarning className="size-6" />
        {s.art === 'kilometer' ? t('spesen.pruefen.kilometerOhneBeleg') : t('spesen.ohneBeleg')}
      </div>
    )
  }
  const pdf = (s.beleg_typ ?? '').includes('pdf') || (s.beleg_name ?? '').toLowerCase().endsWith('.pdf')
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-muted flex min-h-64 items-center justify-center overflow-hidden rounded-lg">
        {!adresse.data ? (
          <Skelett className="h-64 w-full" />
        ) : pdf ? (
          <iframe title={s.beleg_name ?? t('spesen.spalte.beleg')} src={adresse.data} className="h-[28rem] w-full" />
        ) : (
          <img
            src={adresse.data}
            alt={t('spesen.pruefen.belegAlt', { zweck: s.zweck ?? '' })}
            className="max-h-[32rem] w-auto object-contain"
          />
        )}
      </div>
      <Button variant="link" size="sm" className="self-start" onClick={() => void belegZeigen(s.beleg_id ?? '')}>
        <ExternalLink />
        {t('spesen.pruefen.neuesFenster')}
      </Button>
    </div>
  )
}
