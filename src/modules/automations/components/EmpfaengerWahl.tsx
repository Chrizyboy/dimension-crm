import { ArrowRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Label } from '@/components/ui/feld'
import { empfaengerText } from './texte'

interface Props {
  id: string
  label: string
  wert: string[]
  moeglich: readonly string[]
  onChange: (w: string[]) => void
}

/**
 * Empfänger als Reihenfolge: der erste Eintrag, der jemanden findet, bekommt es. So reicht «zuständig,
 * dann Verkauf am Standort, dann Administration», auch wenn ein Lead noch niemandem gehört.
 */
export function EmpfaengerWahl({ id, label, wert, moeglich, onChange }: Props) {
  const { t } = useTranslation()
  const rest = moeglich.filter((m) => !wert.includes(m))
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {wert.map((w, i) => (
          <span key={w} className="flex items-center gap-1.5">
            {i > 0 && (
              <ArrowRight className="text-muted-foreground size-3" aria-label={t('automationen.editor.sonst')} />
            )}
            <span className="bg-muted inline-flex h-7 items-center gap-1 rounded-full pr-1 pl-3 text-xs font-medium">
              {empfaengerText(t, w)}
              <button
                type="button"
                className="hover:bg-surface rounded-full p-0.5"
                aria-label={t('automationen.editor.entfernen', { was: empfaengerText(t, w) })}
                onClick={() => {
                  onChange(wert.filter((x) => x !== w))
                }}
              >
                <X className="size-3" />
              </button>
            </span>
          </span>
        ))}
        {rest.length > 0 && (
          <Auswahl
            id={id}
            className="h-7 w-auto min-w-36 rounded-full text-xs"
            platzhalter={t('automationen.editor.empfaengerDazu')}
            value=""
            optionen={rest.map((r) => ({ wert: r, text: empfaengerText(t, r) }))}
            onValueChange={(v) => {
              onChange([...wert, v])
            }}
          />
        )}
      </div>
      <p className="text-muted-foreground text-xs">{t('automationen.editor.empfaengerHinweis')}</p>
    </div>
  )
}
