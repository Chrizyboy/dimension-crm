import { Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAusgang } from '../hooks/useAusgang'
import { imOrdner } from '../lib/anzeige'

/**
 * Ausgangskorb als runder Knopf neben der Glocke (Chris 27.11.2026: Leiste wie im alten CRM, Ausgangskorb ohne eigenen
 * Eintrag). Die Zahl zeigt, was ich freigeben soll oder mit Fehler hängt, wie früher die Karte auf «Mein Tag».
 */
export default function AusgangKnopf() {
  const { t } = useTranslation()
  const alle = useAusgang('fuer_mich').data ?? []
  const offen = alle.filter((e) => imOrdner(e, 'fuer_mich') || (e.status === 'fehler' && e.fuer_mich)).length
  return (
    <a
      href="#/outbox"
      className={cn(buttonVariants({ variant: 'glas', size: 'rund' }), 'relative')}
      aria-label={offen > 0 ? t('ausgang.knopf.mitZahl', { count: offen }) : t('ausgang.knopf.titel')}
      title={t('ausgang.knopf.titel')}
    >
      <Send />
      {offen > 0 && (
        <span
          aria-hidden="true"
          data-zahl={offen > 9 ? '9+' : String(offen)}
          className="zahlen bg-accent text-accent-foreground absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold after:content-[attr(data-zahl)]"
        />
      )}
    </a>
  )
}
