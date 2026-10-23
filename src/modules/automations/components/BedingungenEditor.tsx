import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OHNE_WERT, wertLesen, wertText } from '../lib/anzeige'
import type { Bedingung, Operator } from '../types'
import { feldText } from './texte'

interface Props {
  id: string
  wert: Bedingung[]
  felder: readonly string[]
  operatoren: readonly Operator[]
  onChange: (b: Bedingung[]) => void
}

/** Bedingungen als Zeilen «Feld · Vergleich · Wert»; alle müssen zutreffen. */
export function BedingungenEditor({ id, wert, felder, operatoren, onChange }: Props) {
  const { t } = useTranslation()
  const setze = (i: number, b: Bedingung) => {
    onChange(wert.map((x, j) => (j === i ? b : x)))
  }
  return (
    <div className="flex flex-col gap-2">
      {wert.length === 0 && <p className="text-muted-foreground text-xs">{t('automationen.editor.keineBedingung')}</p>}
      {wert.map((b, i) => (
        <div key={i} className="grid grid-cols-[1fr_6.5rem_auto] gap-1.5 sm:grid-cols-[1fr_6.5rem_1fr_auto]">
          <Auswahl
            id={`${id}-feld-${i}`}
            aria-label={t('automationen.editor.feld')}
            value={b.feld}
            optionen={[...new Set([...felder, b.feld])].filter(Boolean).map((f) => ({ wert: f, text: feldText(t, f) }))}
            onValueChange={(f) => {
              setze(i, { ...b, feld: f })
            }}
          />
          <Auswahl
            id={`${id}-op-${i}`}
            aria-label={t('automationen.editor.vergleich')}
            value={b.op}
            optionen={operatoren.map((o) => ({ wert: o, text: t(`automationen.op.${o}`) }))}
            onValueChange={(o) => {
              const op = o as Operator
              setze(i, {
                feld: b.feld,
                op,
                ...(OHNE_WERT.includes(op) ? {} : { wert: wertLesen(wertText(b.wert), op) ?? '' }),
              })
            }}
          />
          <Input
            // Schlüssel mit Inhalt: nach Löschen einer Zeile zeigt das Feld den Wert der nachgerückten Zeile.
            key={`${i}:${b.feld}:${wertText(b.wert)}`}
            id={`${id}-wert-${i}`}
            aria-label={t('automationen.editor.wert')}
            className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
            disabled={OHNE_WERT.includes(b.op)}
            placeholder={b.op === 'in' ? t('automationen.editor.wertListe') : ''}
            defaultValue={wertText(b.wert)}
            onBlur={(e) => {
              setze(i, { ...b, wert: wertLesen(e.target.value, b.op) ?? '' })
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('automationen.editor.bedingungWeg')}
            onClick={() => {
              onChange(wert.filter((_, j) => j !== i))
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={felder.length === 0}
        onClick={() => {
          onChange([...wert, { feld: felder[0] ?? '', op: '=', wert: '' }])
        }}
      >
        <Plus />
        {t('automationen.editor.bedingungDazu')}
      </Button>
    </div>
  )
}
