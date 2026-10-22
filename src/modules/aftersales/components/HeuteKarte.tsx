import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAnlagen, useFaelle } from '../hooks/useService'
import { faellig } from '../lib/anzeige'
import type { Reiter } from '../types'

/** Was im Service ansteht, für die Startseite: offene Fälle, davon dringende, fällige Anlagen-Kontrollen. */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const [heute] = useState(() => new Date())
  const faelle = useFaelle('offen')
  const anlagen = useAnlagen()
  if (!faelle.data || !anlagen.data) return null
  const punkte: { schluessel: string; reiter: Reiter; ton: 'info' | 'warnung' | 'kritisch'; n: number }[] = [
    {
      schluessel: 'hoch',
      reiter: 'faelle',
      ton: 'kritisch',
      n: faelle.data.filter((f) => f.prioritaet === 'hoch').length,
    },
    { schluessel: 'offen', reiter: 'faelle', ton: 'info', n: faelle.data.length },
    {
      schluessel: 'kontrollen',
      reiter: 'anlagen',
      ton: 'warnung',
      n: anlagen.data.filter((a) => faellig(a.naechste_kontrolle, heute)).length,
    },
  ]
  const offen = punkte.filter((p) => p.n > 0)

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('service.heute.titel')}</KarteTitel>
        <Link to="/aftersales" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('service.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {offen.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('service.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {offen.map((p) => (
            <li key={p.schluessel}>
              <Link
                to="/aftersales"
                search={{ reiter: p.reiter }}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                {t(`service.heute.${p.schluessel}`)}
                <Badge ton={p.ton}>{String(p.n)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
