import { Target } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf } from '@/lib/format'
import { zielProzent } from '../lib/tag'
import type { MeineZiele } from '../types'
import { ZieleDialog } from './ZieleDialog'

/**
 * «Meine Woche» (M3 A): Wochenziele der Person mit Stand, Aufträge als Monatsbetrag. Wer Ziele setzen darf
 * (Administration, Recht «finanzen»), sieht «Ziele festlegen», auch wenn für sich selbst keine gesetzt sind.
 */
export function ZieleKarte({ ziele, darfSetzen }: { ziele: MeineZiele | null; darfSetzen: boolean }) {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(false)
  if (!ziele && !darfSetzen) return null

  return (
    <Karte className="flex flex-col" data-testid="tag-ziele">
      <KarteKopf className="flex flex-wrap items-center justify-between gap-2">
        <KarteTitel className="flex items-center gap-2">
          <Target className="text-muted-foreground size-4" aria-hidden="true" />
          {t('tag.ziele.titel')}
        </KarteTitel>
        {darfSetzen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setOffen(true)
            }}
          >
            {t('tag.ziele.festlegen')}
          </Button>
        )}
      </KarteKopf>
      {ziele ? (
        <ul className="flex flex-col gap-3 px-4 pt-3 pb-4">
          {ziele.zeilen.map((z) => {
            const prozent = zielProzent(z.ist, z.ziel)
            const betrag = z.schluessel === 'auftrag_monat_rappen'
            return (
              <li key={z.schluessel} className="flex flex-col gap-1 text-sm">
                <span className="flex justify-between gap-2">
                  <span>{t(`tag.ziele.${z.schluessel}`)}</span>
                  <span className="zahlen font-mono text-xs font-medium">
                    {betrag
                      ? `${formatChf(z.ist)} / ${formatChf(z.ziel, { mitWaehrung: true })}`
                      : `${String(z.ist)} / ${String(z.ziel)}`}
                  </span>
                </span>
                <span
                  className="bg-muted h-1.5 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuenow={prozent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(`tag.ziele.${z.schluessel}`)}
                >
                  <span
                    className={prozent >= 100 ? 'bg-ok block h-full' : 'bg-reihe-1 block h-full'}
                    style={{ width: `${String(Math.max(prozent, 2))}%` }}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground px-4 pb-4 text-sm">{t('tag.ziele.keine')}</p>
      )}
      {offen && (
        <ZieleDialog
          onSchliessen={() => {
            setOffen(false)
          }}
        />
      )}
    </Karte>
  )
}
