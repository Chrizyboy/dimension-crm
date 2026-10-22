import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useNachtraege, useRapporte, useTag } from '../hooks/useBaustelle'
import { heute } from '../lib/zeit'

type Zeile = {
  text: string
  zahl: number
  ton: 'neutral' | 'warnung' | 'info'
  reiter: 'tag' | 'rapporte' | 'nachtraege'
}

/** Baustelle für die Startseite: eigene Einsätze heute, offene Rapporte und Nachträge zum Prüfen. */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const tag = useTag(heute(), heute(), null)
  const rapporte = useRapporte('offen')
  const nachtraege = useNachtraege('offen')
  const alle: Zeile[] = [
    {
      text: t('baustelle.heute.einsaetze', { count: tag.data?.eintraege.length ?? 0 }),
      zahl: tag.data?.eintraege.length ?? 0,
      ton: 'info',
      reiter: 'tag',
    },
    {
      text: t('baustelle.heute.offen', { count: (rapporte.data ?? []).filter((r) => r.datum < heute()).length }),
      zahl: (rapporte.data ?? []).filter((r) => r.datum < heute()).length,
      ton: 'warnung',
      reiter: 'rapporte',
    },
    ...(hatRecht(ich, 'preise')
      ? [
          {
            text: t('baustelle.heute.nachtraege', { count: nachtraege.data?.length ?? 0 }),
            zahl: nachtraege.data?.length ?? 0,
            ton: 'neutral' as const,
            reiter: 'nachtraege' as const,
          },
        ]
      : []),
  ]
  const zeilen = alle.filter((z) => z.zahl > 0)

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('baustelle.heute.titel')}</KarteTitel>
        <Link to="/fieldwork" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('baustelle.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {zeilen.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('baustelle.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {zeilen.map((z) => (
            <li key={z.reiter}>
              <Link
                to="/fieldwork"
                search={z.reiter === 'tag' ? {} : { reiter: z.reiter }}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span>{z.text}</span>
                <Badge ton={z.ton}>{z.zahl}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
