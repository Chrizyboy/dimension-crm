import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { useVertraege } from '../hooks/useVertraege'
import { inTagen, wartungTon } from '../lib/anzeige'

/** Fällige Wartungen (nächste 30 Tage oder überfällig) für die Startseite, höchstens fünf. */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const [heute] = useState(() => new Date())
  const liste = useVertraege('faellig', inTagen(heute, 30))
  if (!liste.data) return null
  const faellig = liste.data

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('wartung.heute.titel')}</KarteTitel>
        <Link to="/contracts" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('wartung.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {faellig.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('wartung.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {faellig.slice(0, 5).map((v) => (
            <li key={v.id}>
              <Link
                to="/contracts"
                search={{ vertrag: v.id }}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {v.kunde}
                  {v.ort && <span className="text-muted-foreground"> · {v.ort}</span>}
                </span>
                {v.naechste_wartung && (
                  <Badge ton={wartungTon(v.naechste_wartung, heute)}>{formatDatum(v.naechste_wartung)}</Badge>
                )}
              </Link>
            </li>
          ))}
          {faellig.length > 5 && (
            <li className="text-muted-foreground px-4 py-2 text-xs">
              {t('wartung.heute.mehr', { count: faellig.length - 5 })}
            </li>
          )}
        </ul>
      )}
    </Karte>
  )
}
