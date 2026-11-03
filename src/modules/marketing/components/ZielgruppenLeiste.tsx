import { Bookmark, BookmarkPlus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { useZielgruppen } from '../hooks/useKampagnen'
import { LEERER_FILTER } from '../lib/zielgruppe'
import { speichereZielgruppe, zielgruppeGenutzt, zielgruppePapierkorb } from '../services/kampagnen'
import type { ZielFilter } from '../types'

/**
 * Gespeicherte Zielgruppen («Kunden ohne Batterie Freiamt», «Öl/Gas Greyerz» …): ein Klick setzt den Filter, die
 * Zahl rechnet die App immer neu. Speichern übernimmt den aktuellen Filter ohne Suchtext.
 */
export function ZielgruppenLeiste({ filter, onFilter }: { filter: ZielFilter; onFilter: (f: ZielFilter) => void }) {
  const { t } = useTranslation()
  const liste = useZielgruppen().data ?? []
  const { laeuft, aus } = useAktion()
  const [name, setName] = useState<string | null>(null)
  const geaendert = JSON.stringify({ ...filter, suche: '' }) !== JSON.stringify(LEERER_FILTER)

  async function speichern() {
    if (!name?.trim()) return
    await aus(() => speichereZielgruppe(name.trim(), { ...filter, suche: '' }, null), {
      de: 'Zielgruppe gespeichert',
      fr: 'Groupe cible enregistré',
    })
    setName(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('werbung.zielgruppe.titel')}>
      <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
        <Bookmark className="size-3.5" aria-hidden="true" />
        {t('werbung.zielgruppe.titel')}
      </span>
      {liste.length === 0 && <span className="text-muted-foreground text-xs">{t('werbung.zielgruppe.leer')}</span>}
      {liste.map((z) => (
        <span key={z.id} className="bg-surface inline-flex items-center rounded-full border text-sm">
          <button
            type="button"
            className="hover:text-primary rounded-l-full py-1 pr-1 pl-3"
            title={z.beschreibung ?? undefined}
            onClick={() => {
              onFilter({ ...LEERER_FILTER, ...z.filter })
              void zielgruppeGenutzt(z.id)
            }}
          >
            {z.name}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-bad rounded-r-full py-1 pr-2 pl-1"
            aria-label={t('werbung.zielgruppe.entfernen', { name: z.name })}
            onClick={() => void aus(() => zielgruppePapierkorb(z.id))}
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      {name === null ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={!geaendert}
          onClick={() => {
            setName('')
          }}
        >
          <BookmarkPlus />
          {t('werbung.zielgruppe.speichern')}
        </Button>
      ) : (
        <span className="flex items-center gap-1">
          <Input
            autoFocus
            className="h-8 w-56"
            aria-label={t('werbung.zielgruppe.name')}
            placeholder={t('werbung.zielgruppe.name')}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void speichern()
              if (e.key === 'Escape') setName(null)
            }}
          />
          <Button size="sm" laedt={laeuft} disabled={!name.trim()} onClick={() => void speichern()}>
            {t('werbung.speichern')}
          </Button>
        </span>
      )}
    </div>
  )
}
