import { Camera, Car, MessageCircleQuestion } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { formatChf, formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKategorieText } from '../hooks/useKategorieText'
import { useSpesen } from '../hooks/useSpesen'
import { filtern, summe } from '../lib/spesen'
import type { Spese } from '../types'
import { StandMarke } from './Marken'
import { SpeseErfassen } from './SpeseErfassen'

/**
 * Spesen für die einfache Monteur-Ansicht: ein grosser Knopf «Spese erfassen» (Foto, die KI füllt den Rest),
 * Kilometer mit dem Privatauto, Rückfragen der Buchhaltung zum Beantworten und die letzten eigenen Spesen mit
 * Stand, damit man sieht, was geprüft und ausbezahlt ist.
 */
export default function SpesenSchnell() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const kategorie = useKategorieText()
  const { spesen_kategorien } = useFinanzEinstellungen()
  const [neu, setNeu] = useState<'beleg' | 'kilometer' | null>(null)
  const [aendern, setAendern] = useState<Spese | null>(null)
  const liste = useSpesen(ich?.id ?? null, Boolean(ich)).data ?? []
  const geprueft = liste.filter((s) => s.status === 'geprueft' && s.bezahlt_mit === 'eigen')
  const offen = filtern(liste, 'offen')
  const rueckfragen = liste.filter((s) => s.status === 'rueckfrage')
  if (!ich) return null

  return (
    <Karte>
      <KarteKopf className="flex items-center justify-between gap-3">
        <KarteTitel>{t('spesen.titel')}</KarteTitel>
        {offen.length > 0 && (
          <Badge ton="info">
            {t('einfach.spesen.offen', { betrag: formatChf(summe(offen), { mitWaehrung: true }) })}
          </Badge>
        )}
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-4">
        <Button
          size="lg"
          className="h-16 text-base"
          onClick={() => {
            setNeu('beleg')
          }}
        >
          <Camera />
          {t('einfach.spesen.erfassen')}
        </Button>
        {spesen_kategorien.some((k) => k.art === 'kilometer') && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              setNeu('kilometer')
            }}
          >
            <Car />
            {t('spesen.kilometerErfassen')}
          </Button>
        )}
        {geprueft.length > 0 && (
          <p className="bg-ok-soft text-ok rounded-md px-3 py-2 text-sm">
            {t('einfach.spesen.wirdAusbezahlt', { betrag: formatChf(summe(geprueft), { mitWaehrung: true }) })}
          </p>
        )}
        {rueckfragen.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setAendern(s)
            }}
            className="bg-warn-soft text-warn focus-visible:ring-ring flex items-start gap-2 rounded-md px-3 py-2 text-left text-sm outline-none focus-visible:ring-2"
          >
            <MessageCircleQuestion className="mt-0.5 size-4 shrink-0" />
            <span>
              <b>{s.zweck}</b> «{s.rueckfrage}» · {t('spesen.meine.beantworten')}
            </span>
          </button>
        ))}
        {liste.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('einfach.spesen.keine')}</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {liste.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="line-clamp-2">{s.zweck || kategorie(s.kategorie)}</span>
                  <span className="text-muted-foreground text-xs">
                    {[formatDatum(s.datum), kategorie(s.kategorie), s.projekt_nummer].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="zahlen">{formatChf(s.betrag_rappen)}</span>
                  <StandMarke spese={s} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </KarteInhalt>
      {neu && (
        <SpeseErfassen
          personId={ich.id}
          start={neu}
          onSchliessen={() => {
            setNeu(null)
          }}
        />
      )}
      {aendern && (
        <SpeseErfassen
          personId={ich.id}
          spese={aendern}
          onSchliessen={() => {
            setAendern(null)
          }}
        />
      )}
    </Karte>
  )
}
