import { Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { summen, zeilenBetrag } from '../lib/rechnung'
import { entwurfSpeichern } from '../services/rechnungen'
import type { Position, RechnungVoll } from '../types'

interface Zeile {
  text: string
  menge: string
  einheit: string
  preis: string
  bezug?: Position['bezug']
  bezug_id?: string | null
}

const zuZeile = (p: Position): Zeile => ({
  text: p.text,
  menge: String(p.menge),
  einheit: p.einheit ?? '',
  preis: formatChf(p.preis_rappen).replace('−', '-'),
  ...(p.bezug ? { bezug: p.bezug, bezug_id: p.bezug_id ?? null } : {}),
})

const zuPosition = (z: Zeile): Position => ({
  text: z.text.trim(),
  menge: Number(z.menge.replace(',', '.')) || 0,
  ...(z.einheit.trim() ? { einheit: z.einheit.trim() } : {}),
  preis_rappen: parseChf(z.preis) ?? 0,
  ...(z.bezug ? { bezug: z.bezug, bezug_id: z.bezug_id ?? null } : {}),
})

/** Positionen und Summen; im Entwurf bearbeitbar (Text, Menge, Einheit, Preis, inkl./exkl. MWST). */
export function PositionenEditor({ rechnung: r }: { rechnung: RechnungVoll }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const offen = r.status === 'entwurf'
  const [zeilen, setZeilen] = useState<Zeile[]>(() => r.positionen.map(zuZeile))
  const [inkl, setInkl] = useState(r.inkl_mwst)
  const positionen = offen ? zeilen.map(zuPosition) : r.positionen
  const s = offen
    ? summen(positionen, inkl, r.mwst_satz)
    : { netto: r.netto_rappen, mwst: r.mwst_rappen, total: r.total_rappen }
  const geaendert =
    offen &&
    (inkl !== r.inkl_mwst ||
      JSON.stringify(positionen) !== JSON.stringify(r.positionen.map((p) => zuPosition(zuZeile(p)))))
  const aendern = (i: number, feld: keyof Zeile, wert: string) => {
    setZeilen(zeilen.map((z, j) => (j === i ? { ...z, [feld]: wert } : z)))
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y text-sm">
        {offen
          ? zeilen.map((z, i) => (
              <li key={i} className="grid grid-cols-[1fr_4rem_3.5rem_6rem_auto] items-center gap-1.5 py-1.5">
                <Input
                  aria-label={t('rechnungen.pos.text')}
                  value={z.text}
                  onChange={(e) => {
                    aendern(i, 'text', e.target.value)
                  }}
                />
                <Input
                  aria-label={t('rechnungen.pos.menge')}
                  inputMode="decimal"
                  className="text-right"
                  value={z.menge}
                  onChange={(e) => {
                    aendern(i, 'menge', e.target.value)
                  }}
                />
                <Input
                  aria-label={t('rechnungen.pos.einheit')}
                  value={z.einheit}
                  onChange={(e) => {
                    aendern(i, 'einheit', e.target.value)
                  }}
                />
                <Input
                  aria-label={t('rechnungen.pos.preis')}
                  inputMode="decimal"
                  className="text-right"
                  value={z.preis}
                  onChange={(e) => {
                    aendern(i, 'preis', e.target.value)
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('rechnungen.pos.entfernen')}
                  onClick={() => {
                    setZeilen(zeilen.filter((_, j) => j !== i))
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))
          : r.positionen.map((p, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="min-w-0">
                  {p.text}
                  <span className="text-muted-foreground zahlen ml-2 text-xs">
                    {p.menge.toLocaleString('de-CH')} {p.einheit ?? ''} × {formatChf(p.preis_rappen)}
                  </span>
                </span>
                <span className="zahlen shrink-0">{formatChf(zeilenBetrag(p))}</span>
              </li>
            ))}
      </ul>
      {offen && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setZeilen([...zeilen, { text: '', menge: '1', einheit: '', preis: '0.00' }])
            }}
          >
            <Plus />
            {t('rechnungen.pos.neu')}
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={inkl} onCheckedChange={setInkl} />
            {t('rechnungen.pos.inklMwst')}
          </label>
        </div>
      )}
      <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t('rechnungen.pdf.netto')}</dt>
        <dd className="zahlen text-right">{formatChf(s.netto)}</dd>
        <dt className="text-muted-foreground">
          {t('rechnungen.pdf.mwst', { satz: r.mwst_satz.toLocaleString('de-CH') })}
        </dt>
        <dd className="zahlen text-right">{formatChf(s.mwst)}</dd>
        <dt className="font-semibold">{t('rechnungen.pdf.total')}</dt>
        <dd className="zahlen text-right font-semibold">{formatChf(s.total, { mitWaehrung: true })}</dd>
      </dl>
      {geaendert && (
        <Button
          className="self-end"
          laedt={laeuft}
          disabled={positionen.some((p) => !p.text)}
          onClick={() =>
            void aus(() => entwurfSpeichern(r.id, { positionen, inkl_mwst: inkl }), {
              de: 'Gespeichert',
              fr: 'Enregistré',
            })
          }
        >
          <Save />
          {t('allgemein.speichern')}
        </Button>
      )}
    </div>
  )
}
