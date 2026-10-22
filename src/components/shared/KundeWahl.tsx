import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { sucheKontakte } from '@/services/kontakte'
import type { Kontaktzeile } from '@/types/kontakt'

/** Gewählter Kunde: genug für Anzeige und Speichern. */
export interface GewaehlterKunde {
  id: string
  name: string
  ort: string | null
  sprache: 'de' | 'fr'
  objektId: string | null
}

/**
 * Kunde suchen und wählen (Name, Ort, Telefon, Kundennummer), z. B. für Service-Fälle und Wartungsverträge.
 * Zeigt bis zu acht Treffer; gewählt wird mit Klick oder Enter.
 */
export function KundeWahl({
  id,
  wert,
  onWahl,
}: {
  id: string
  wert: GewaehlterKunde | null
  onWahl: (k: GewaehlterKunde | null) => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [suche, setSuche] = useState('')
  useEffect(() => {
    const z = setTimeout(() => {
      setSuche(text)
    }, 250)
    return () => {
      clearTimeout(z)
    }
  }, [text])
  const treffer = useQuery({
    queryKey: ['kontakte', 'suche', suche],
    queryFn: () => sucheKontakte(suche),
    enabled: suche.trim().length >= 2,
  })

  const waehle = (k: Kontaktzeile) => {
    onWahl({ id: k.id, name: k.name, ort: k.ort, sprache: k.sprache, objektId: k.objektId })
    setText('')
    setSuche('')
  }

  if (wert) {
    return (
      <div className="bg-muted/50 flex h-8 items-center justify-between gap-2 rounded-md border px-2.5 text-sm">
        <span className="truncate">
          {wert.name}
          {wert.ort ? <span className="text-muted-foreground"> · {wert.ort}</span> : null}
        </span>
        <button
          type="button"
          aria-label={t('kundeWahl.andere')}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded outline-none focus-visible:ring-2"
          onClick={() => {
            onWahl(null)
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  const liste = suche.trim().length >= 2 ? (treffer.data ?? []) : []
  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4" aria-hidden="true" />
      <Input
        id={id}
        className="pl-8"
        role="combobox"
        aria-expanded={liste.length > 0}
        aria-controls={`${id}-liste`}
        placeholder={t('kundeWahl.platzhalter')}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
        }}
        onKeyDown={(e) => {
          const erster = liste[0]
          if (e.key === 'Enter' && erster) {
            e.preventDefault()
            waehle(erster)
          }
        }}
      />
      {liste.length > 0 && (
        <ul
          id={`${id}-liste`}
          role="listbox"
          className="bg-surface shadow-pop absolute inset-x-0 top-9 z-10 max-h-64 overflow-y-auto rounded-md border py-1"
        >
          {liste.map((k) => (
            <li key={k.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="hover:bg-muted flex w-full flex-col px-2.5 py-1.5 text-left text-sm"
                onClick={() => {
                  waehle(k)
                }}
              >
                <span className="truncate font-medium">{k.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {[k.kundennummer, [k.plz, k.ort].filter(Boolean).join(' '), k.telefon].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {suche.trim().length >= 2 && treffer.isSuccess && liste.length === 0 && (
        <p className="text-muted-foreground mt-1 text-xs">{t('kundeWahl.keine')}</p>
      )}
    </div>
  )
}
