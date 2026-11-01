import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { knappeWoche } from '../lib/reserve'
import type { Woche } from '../types'

/**
 * Hinweis in Bernstein, wenn der Kontostand in den nächsten vier Wochen unter die Reserve fällt: Woche, Betrag und
 * ein Vorschlag (grösster erwarteter Eingang, z. B. «Rate jetzt stellen»). Ohne knappe Woche nichts.
 */
export function ReserveHinweis({ wochen, reserve }: { wochen: readonly Woche[]; reserve: number }) {
  const { t } = useTranslation()
  const k = knappeWoche(wochen, reserve)
  if (!k) return null
  return (
    <p role="status" className="bg-warn-soft text-warn flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        {t('finanzen.reserve.knapp', {
          kw: k.woche.kw,
          stand: formatChf(k.woche.ende, { mitWaehrung: true }),
          fehlt: formatChf(k.fehlt, { mitWaehrung: true }),
        })}
        {k.vorschlag &&
          ` ${t('finanzen.reserve.vorschlag', { titel: k.vorschlag.titel, betrag: formatChf(k.vorschlag.rappen, { mitWaehrung: true }) })}`}
      </span>
    </p>
  )
}
