import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import type { Teilschritt } from '../types'

/** Teilschritte abhaken, hinzufügen (Enter) und entfernen; gespeichert wird die ganze Liste. */
export function TeilschritteBox({
  schritte,
  onAendern,
}: {
  schritte: Teilschritt[]
  onAendern: (s: Teilschritt[]) => void
}) {
  const { t } = useTranslation()
  const [neu, setNeu] = useState('')
  return (
    <div className="flex flex-col gap-1.5">
      {schritte.map((s) => (
        <div key={s.id} className="group flex items-center gap-2 text-sm">
          <Checkbox
            checked={s.erledigt}
            aria-label={s.text}
            onCheckedChange={(an) => {
              onAendern(schritte.map((x) => (x.id === s.id ? { ...x, erledigt: an === true } : x)))
            }}
          />
          <span className={s.erledigt ? 'text-muted-foreground flex-1 line-through' : 'flex-1'}>{s.text}</span>
          <button
            type="button"
            aria-label={t('aufgaben.akte.schrittEntfernen', { text: s.text })}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded p-0.5 opacity-0 outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2"
            onClick={() => {
              onAendern(schritte.filter((x) => x.id !== s.id))
            }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <Input
        aria-label={t('aufgaben.akte.schrittNeu')}
        placeholder={t('aufgaben.akte.schrittNeu')}
        value={neu}
        onChange={(e) => {
          setNeu(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && neu.trim()) {
            onAendern([...schritte, { id: crypto.randomUUID(), text: neu.trim(), erledigt: false }])
            setNeu('')
          }
        }}
      />
    </div>
  )
}
