import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useBenachrichtigungen } from '@/stores/benachrichtigungen'
import { useTagesbericht } from '../hooks/useAusschreibungen'
import type { Reiter, Tagesbericht } from '../types'

interface Punkt {
  schluessel: keyof Tagesbericht
  reiter: Reiter
  ton: 'neutral' | 'info' | 'warnung' | 'kritisch'
  /** Nur zeigen, wenn die Person diesen Schritt machen darf. */
  nur?: 'darf_bewilligen' | 'darf_senden'
}

const PUNKTE: Punkt[] = [
  { schluessel: 'neu_heute', reiter: 'pruefen', ton: 'info' },
  { schluessel: 'pruefen', reiter: 'pruefen', ton: 'warnung' },
  { schluessel: 'bewilligen', reiter: 'bewilligen', ton: 'warnung', nur: 'darf_bewilligen' },
  { schluessel: 'senden', reiter: 'senden', ton: 'warnung', nur: 'darf_senden' },
  { schluessel: 'antworten', reiter: 'pruefen', ton: 'info' },
  { schluessel: 'kontakt_fehlt', reiter: 'pruefen', ton: 'kritisch' },
  { schluessel: 'fristen', reiter: 'alle', ton: 'warnung' },
  { schluessel: 'quellen_still', reiter: 'quellen', ton: 'kritisch' },
]

/** Was heute zu tun ist, nur Punkte mit einer Zahl. */
function offenePunkte(b: Tagesbericht) {
  return PUNKTE.filter((p) => (!p.nur || b[p.nur]) && Number(b[p.schluessel]) > 0)
}

/** Heutiges Datum (Ortszeit) als Schlüssel, damit die Glocke höchstens einmal pro Tag meldet. */
const heute = () => new Date().toLocaleDateString('sv-SE')

/**
 * Tageszusammenfassung des Monitors für die Startseite: neue Meldungen, was auf mich wartet, nahe Fristen
 * und stille Quellen. Meldet dasselbe einmal am Tag über die Glocke.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const bericht = useTagesbericht()
  const hinzufuegen = useBenachrichtigungen((z) => z.hinzufuegen)
  const b = bericht.data
  const punkte = b ? offenePunkte(b) : []

  useEffect(() => {
    const offen = b ? offenePunkte(b) : []
    if (!b || offen.length === 0) return
    try {
      if (localStorage.getItem('ausschreibungen-glocke') === heute()) return
      localStorage.setItem('ausschreibungen-glocke', heute())
    } catch {
      return
    }
    const teile = (s: 'de' | 'fr') =>
      offen
        .map((p) => `${String(b[p.schluessel])} ${t(`ausschreibungen.heute.${p.schluessel}`, { lng: s })}`)
        .join(', ')
    hinzufuegen({
      art: b.quellen_still || b.kontakt_fehlt ? 'warnung' : 'info',
      titel: {
        de: t('ausschreibungen.heute.titel', { lng: 'de' }),
        fr: t('ausschreibungen.heute.titel', { lng: 'fr' }),
      },
      text: { de: teile('de'), fr: teile('fr') },
      ziel: '/tenders',
    })
  }, [b, hinzufuegen, t])

  if (!b) return null
  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('ausschreibungen.heute.titel')}</KarteTitel>
        <Link to="/tenders" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          {t('ausschreibungen.heute.oeffnen')}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {punkte.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('ausschreibungen.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {punkte.map((p) => (
            <li key={p.schluessel}>
              <Link
                to="/tenders"
                search={{ reiter: p.reiter }}
                className="hover:bg-surface-2 flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                {t(`ausschreibungen.heute.${p.schluessel}`)}
                <Badge ton={p.ton}>{String(b[p.schluessel])}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
