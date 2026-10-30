import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useGrossprojekte } from '../hooks/useGrossprojekte'
import { groesse } from '../lib/anzeige'
import { PunkteMarke } from './PunkteMarke'

/**
 * Grossprojekte für «Mein Tag»: die besten, die noch einen Entscheid brauchen (ohne Ausgeschlossene). Höchstens fünf
 * Zeilen; Klick öffnet die Akte.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const offen = (useGrossprojekte(Boolean(ich)).data ?? []).filter((g) => g.stand === 'pruefen' && !g.ausschluss)

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('grossprojekte.heute.titel')}</KarteTitel>
        <Link to="/contracting" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('grossprojekte.heute.alle', { count: offen.length })}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {offen.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('grossprojekte.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {offen.slice(0, 5).map((g) => (
            <li key={g.id}>
              {/* Titel auf eigener Zeile, Punkte und Grösse darunter: in der schmalen Karte bliebe sonst vom Namen nichts. */}
              <a
                href={`#/contracting?projekt=${g.id}`}
                className="hover:bg-surface-2 flex flex-col gap-1 px-4 py-2 text-sm"
              >
                <span className="line-clamp-2">{g.titel}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <PunkteMarke g={g} t={t} />
                  <span className="text-muted-foreground zahlen text-xs">
                    {[g.gemeinde, groesse(g, t('grossprojekte.waerme'))].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
