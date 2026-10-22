import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Zahl direkt in der Tabelle ändern (V87): speichert beim Verlassen oder mit Enter, Esc verwirft.
 * Klicks und Tasten gehen nicht an die Zeile weiter, damit sich das Seitenpanel nicht öffnet.
 */
export function PreisFeld({
  wert,
  onSpeichern,
  label,
  className,
}: {
  wert: string
  onSpeichern: (text: string) => void
  label: string
  className?: string
}) {
  const [text, setText] = useState<string | null>(null)
  const zeigen = text ?? wert
  const fertig = () => {
    if (text !== null && text !== wert) onSpeichern(text)
    setText(null)
  }
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={zeigen}
      onClick={(e) => {
        e.stopPropagation()
      }}
      onChange={(e) => {
        setText(e.target.value)
      }}
      onBlur={fertig}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setText(null)
          e.currentTarget.blur()
        }
      }}
      className={cn(
        'zahlen hover:border-border focus-visible:border-ring focus-visible:ring-ring/30 h-7 w-20 rounded border border-transparent bg-transparent px-1.5 text-right font-mono text-[13px] outline-none focus-visible:ring-2',
        className,
      )}
    />
  )
}
