import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { useSpesenProjekte } from '../hooks/useSpesen'
import type { SpesenProjekt } from '../types'

const text = (p: SpesenProjekt) => [p.nummer, p.titel].filter(Boolean).join(' · ')

/**
 * Projekt zur Spese (für die Nachkalkulation), mit Suche über Nummer und Kunde. Leer = ohne Projekt.
 * Eine Liste mit Vorschlägen (datalist) reicht hier: man tippt die Nummer oder den Namen und wählt.
 */
export function ProjektWahl({
  id,
  projektId,
  onChange,
}: {
  id: string
  projektId: string | null
  onChange: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const liste = useSpesenProjekte().data ?? []
  const listeId = useId()
  const gewaehlt = liste.find((p) => p.id === projektId)
  const [eingabe, setEingabe] = useState<string | null>(null)
  const wert = eingabe ?? (gewaehlt ? text(gewaehlt) : '')

  return (
    <>
      <Input
        id={id}
        list={listeId}
        value={wert}
        placeholder={t('spesen.erfassen.ohneProjekt')}
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value
          setEingabe(v)
          const treffer = liste.find((p) => text(p) === v || p.nummer === v.trim())
          if (treffer) {
            onChange(treffer.id)
            setEingabe(null)
          } else if (!v.trim()) onChange(null)
        }}
        onBlur={() => {
          // Unvollständige Eingabe nicht stehen lassen: sonst sieht es nach einem Projekt aus, das nicht gilt.
          setEingabe(null)
        }}
      />
      <datalist id={listeId}>
        {liste.map((p) => (
          <option key={p.id} value={text(p)} />
        ))}
      </datalist>
    </>
  )
}
