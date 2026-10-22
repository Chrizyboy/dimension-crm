import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useEinsaetze, useProjekte } from '../hooks/useProjekte'
import { alsIso } from '../lib/zeitplan'
import type { Reiter } from '../types'

const STATUS = ['auftrag', 'im_bau'] as const

/**
 * Was heute auf dem Bau ansteht, für die Startseite: wer heute auf einer Baustelle ist, Baustellen ohne
 * Termin und überfällige Bewilligungen. Nur Punkte mit einer Zahl.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const [heute] = useState(() => alsIso(new Date()))
  const projekte = useProjekte([...STATUS])
  const einsaetze = useEinsaetze(heute, heute)
  if (!projekte.data || !einsaetze.data) return null

  const punkte: { schluessel: string; reiter: Reiter; ton: 'info' | 'warnung' | 'kritisch'; n: number }[] = [
    {
      schluessel: 'heute',
      reiter: 'zeitplan',
      ton: 'info',
      n: new Set(einsaetze.data.filter((e) => e.art !== 'geplant').map((e) => e.projekt_id)).size,
    },
    {
      schluessel: 'ohneTermin',
      reiter: 'baustellen',
      ton: 'warnung',
      n: projekte.data.filter((p) => p.status === 'im_bau' && (p.bau_status ?? 'ausstehend') === 'ausstehend').length,
    },
    {
      schluessel: 'bewilligungen',
      reiter: 'bewilligungen',
      ton: 'kritisch',
      n: projekte.data.filter((p) => (p.stand?.bewilligungen_spaet ?? 0) > 0).length,
    },
  ]
  const offen = punkte.filter((p) => p.n > 0)

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('projekte.heute.titel')}</KarteTitel>
        <Link to="/projects" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('projekte.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {offen.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('projekte.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {offen.map((p) => (
            <li key={p.schluessel}>
              <Link
                to="/projects"
                search={{ reiter: p.reiter }}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                {t(`projekte.heute.${p.schluessel}`)}
                <Badge ton={p.ton}>{String(p.n)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
