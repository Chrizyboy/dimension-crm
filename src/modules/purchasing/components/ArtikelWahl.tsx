import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sucheArtikel } from '../services/material'
import type { ArtikelTreffer } from '../types'

/**
 * Artikel aus der Preisliste suchen (Name oder Artikelnummer) und übernehmen. Findet sich nichts, lässt sich
 * der Text als freie Position übernehmen (z. B. Kleinmaterial, das nicht in der Preisliste steht).
 */
export function ArtikelWahl({
  id,
  onWahl,
  onFrei,
}: {
  id: string
  onWahl: (a: ArtikelTreffer) => void
  onFrei: (text: string) => void
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
  const aktiv = suche.trim().length >= 2
  const treffer = useQuery({
    queryKey: ['einkauf', 'artikel', suche],
    queryFn: () => sucheArtikel(suche),
    enabled: aktiv,
  })
  const liste = aktiv ? (treffer.data ?? []) : []

  const waehle = (a: ArtikelTreffer) => {
    onWahl(a)
    setText('')
    setSuche('')
  }

  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4" aria-hidden="true" />
      <Input
        id={id}
        className="pl-8"
        role="combobox"
        aria-expanded={liste.length > 0}
        aria-controls={`${id}-liste`}
        aria-label={t('einkauf.artikelSuchen')}
        placeholder={t('einkauf.artikelSuchen')}
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
          {liste.map((a) => (
            <li key={a.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="hover:bg-muted flex w-full flex-col px-2.5 py-1.5 text-left text-sm"
                onClick={() => {
                  waehle(a)
                }}
              >
                <span className="truncate font-medium">{a.name}</span>
                {a.artikelnummer && <span className="text-muted-foreground truncate text-xs">{a.artikelnummer}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {aktiv && treffer.isSuccess && liste.length === 0 && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">{t('einkauf.keinArtikel')}</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onFrei(text.trim())
              setText('')
              setSuche('')
            }}
          >
            <Plus />
            {t('einkauf.freiePosition')}
          </Button>
        </div>
      )}
    </div>
  )
}
