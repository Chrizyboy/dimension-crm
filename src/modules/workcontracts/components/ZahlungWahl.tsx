import { Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { ratenSumme } from '../lib/zahlungsplan'
import type { EigeneRate, Tranche } from '../types'
import { Zahlungsplan } from './Zahlungsplan'

/** Prozent aus dem Eingabefeld (Komma oder Punkt); leer oder unlesbar = 0. */
const prozentAus = (text: string) => {
  const n = Number(text.replace(',', '.').replace('%', '').trim())
  return Number.isFinite(n) ? n : 0
}

/** Eigene Raten: je Zeile Bezeichnung und Prozent, darunter die Summe (muss 100 % sein). */
function RatenFelder({ raten, onChange }: { raten: EigeneRate[]; onChange: (r: EigeneRate[]) => void }) {
  const { t } = useTranslation()
  const summe = ratenSumme(raten)
  const aendern = (i: number, teil: Partial<EigeneRate>) => {
    onChange(raten.map((r, j) => (j === i ? { ...r, ...teil } : r)))
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{t('werkvertraege.auftrag.raten')}</legend>
      {raten.map((r, i) => {
        const nr = String(i + 1)
        return (
          // Schlüssel mit Anzahl: nach Hinzufügen/Entfernen starten die Prozentfelder mit den richtigen Werten.
          <div key={`${nr}-${String(raten.length)}`} className="flex items-center gap-2">
            <Input
              aria-label={t('werkvertraege.auftrag.rateText', { nr })}
              value={r.text}
              className="min-w-0 flex-1"
              onChange={(e) => {
                aendern(i, { text: e.target.value })
              }}
            />
            <div className="flex items-center gap-1">
              <Input
                aria-label={t('werkvertraege.auftrag.rateProzent', { nr })}
                inputMode="decimal"
                className="w-20 text-right"
                defaultValue={String(r.prozent)}
                onChange={(e) => {
                  aendern(i, { prozent: prozentAus(e.target.value) })
                }}
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('werkvertraege.auftrag.rateEntfernen', { nr })}
              disabled={raten.length <= 1}
              onClick={() => {
                onChange(raten.filter((_, j) => j !== i))
              }}
            >
              <X />
            </Button>
          </div>
        )
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={raten.length >= 6}
          onClick={() => {
            onChange([...raten, { text: '', prozent: Math.max(0, Math.round((100 - summe) * 100) / 100) }])
          }}
        >
          <Plus />
          {t('werkvertraege.auftrag.rateHinzu')}
        </Button>
        <span className={summe === 100 ? 'text-muted-foreground text-xs' : 'text-bad text-xs'} aria-live="polite">
          {summe === 100 ? t('werkvertraege.auftrag.ratenHinweis') : t('werkvertraege.auftrag.ratenSumme', { summe })}
        </span>
      </div>
    </fieldset>
  )
}

/**
 * Zahlungsbedingung mit einem Klick: Vorlagen als Knöpfe (40 / 30 / 30, 70 / 30, 100 % …), bei «Eigene
 * Anzahlung» ein Betrag in CHF, bei «Eigene Raten» freie Raten mit Bezeichnung und Prozent. Darunter sofort
 * der Zahlungsplan, wie er im Vertrag steht.
 */
export function ZahlungWahl({
  kondition,
  anzahlung,
  raten,
  vorschau,
  onKondition,
  onAnzahlung,
  onRaten,
}: {
  kondition: string
  anzahlung: string
  raten: EigeneRate[]
  vorschau: Tranche[]
  onKondition: (k: string) => void
  onAnzahlung: (text: string) => void
  onRaten: (r: EigeneRate[]) => void
}) {
  const { t } = useTranslation()
  const konditionen = useAuswahl('zahlungskondition')
  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        einzeln
        beschriftung={t('werkvertraege.auftrag.kondition')}
        optionen={konditionen.werte.map((k) => ({ wert: k.schluessel, text: konditionen.text(k.schluessel) }))}
        gewaehlt={[kondition]}
        onChange={(w) => {
          if (w[0]) onKondition(w[0])
        }}
      />
      {kondition === 'anzahlung' && (
        <Feld
          id="auftrag-anzahlung"
          label={t('werkvertraege.auftrag.anzahlung')}
          hinweis={t('werkvertraege.auftrag.anzahlungHinweis')}
          pflicht
        >
          <Input
            id="auftrag-anzahlung"
            inputMode="decimal"
            value={anzahlung}
            onChange={(e) => {
              onAnzahlung(e.target.value)
            }}
          />
        </Feld>
      )}
      {kondition === 'eigene' && <RatenFelder raten={raten} onChange={onRaten} />}
      <Zahlungsplan tranchen={vorschau} />
    </div>
  )
}
