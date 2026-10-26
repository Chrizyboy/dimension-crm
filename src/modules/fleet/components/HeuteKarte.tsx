import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAnmeldung } from '@/stores/anmeldung'
import { hatRecht } from '@/lib/rechte'
import { useFristen } from '../hooks/useRessourcen'
import { anstehend, heuteZuerich } from '../lib/fristen'
import { FristBadge } from './FristBadge'

/**
 * Fristen für «Mein Tag»: was in 30 Tagen fällig wird (Ausweise 60 Tage). Jede Person sieht ihre eigenen
 * (zugeteiltes Fahrzeug, Gerät bei ihr, eigene Ausweise), die Administration alle. Höchstens fünf Zeilen.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const quali = useAuswahl('qualifikation')
  const admin = hatRecht(ich, 'admin')
  const heute = heuteZuerich()
  const alle = anstehend(useFristen(Boolean(ich)).data ?? [], heute, 30, 60)
  const meine = admin ? alle : alle.filter((f) => f.person_id === ich?.id)
  const ziel = (f: (typeof meine)[number]) =>
    f.bezug_tabelle === 'qualifikationen'
      ? `#/staff?person=${f.person_id ?? ''}`
      : f.bezug_tabelle === 'fahrzeuge'
        ? `#/fleet?fahrzeug=${f.bezug_id}`
        : `#/fleet?ansicht=geraete&geraet=${f.bezug_id}`

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('fuhrpark.heute.titel')}</KarteTitel>
        <Link
          to="/fleet"
          search={{ ansicht: 'fristen' }}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          {t('fuhrpark.heute.alle', { count: meine.length })}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {meine.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('fuhrpark.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {meine.slice(0, 5).map((f) => (
            <li key={`${f.art}-${f.bezug_id}`}>
              {/* Titel auf eigener Zeile, Frist darunter: in der schmalen Karte bliebe sonst vom Namen nichts übrig. */}
              <a href={ziel(f)} className="hover:bg-surface-2 flex flex-col gap-1 px-4 py-2 text-sm">
                <span className="truncate">{f.art === 'ausweis' ? quali.text(f.titel) : f.titel}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <FristBadge datum={f.faellig_am} vorlauf={f.art === 'ausweis' ? 60 : 30} />
                  <span className="text-muted-foreground text-xs">{t(`fuhrpark.fristen.art.${f.art}`)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
