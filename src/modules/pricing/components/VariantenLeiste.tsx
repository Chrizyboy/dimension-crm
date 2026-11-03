import { Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { dbTon, summe } from '../lib/kalkulation'
import type { Kalkulation } from '../types'

const IDS = ['A', 'B', 'C'] as const
const TON = { ok: 'ok', warnung: 'warnung', kritisch: 'kritisch' } as const

/**
 * Varianten nebeneinander (P3): bis drei Varianten mit Total inkl. MWST und Marge. Klick wählt die Variante,
 * die in Summen, Freigabe und Offerte zählt. Ohne Varianten nur der Knopf «Varianten vergleichen».
 */
export function VariantenLeiste({
  k,
  satz,
  onAendern,
}: {
  k: Kalkulation
  satz: number
  onAendern: (k: Kalkulation) => void
}) {
  const { t } = useTranslation()
  const varianten = k.varianten ?? []

  if (varianten.length === 0) {
    return (
      <div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            onAendern({
              ...k,
              varianten: [
                { id: 'A', name: t('preise.var.standardA') },
                { id: 'B', name: t('preise.var.standardB') },
              ],
              variante: 'A',
            })
          }}
        >
          <Plus />
          {t('preise.var.vergleichen')}
        </Button>
      </div>
    )
  }

  function entferne(id: string) {
    const rest = varianten.filter((v) => v.id !== id)
    onAendern({
      ...k,
      varianten: rest.length > 1 ? rest : [],
      variante: rest.length > 1 ? (k.variante === id ? (rest[0]?.id ?? null) : (k.variante ?? null)) : null,
      // Positionen nur dieser Variante fallen weg, die übrigen verlieren den Verweis.
      positionen: k.positionen
        .filter((p) => !(p.varianten?.length === 1 && p.varianten[0] === id))
        .map((p) => {
          if (!p.varianten) return p
          const v = p.varianten.filter((x) => x !== id)
          const ohne = { ...p }
          delete ohne.varianten
          return rest.length > 1 && v.length > 0 && v.length < rest.length ? { ...p, varianten: v } : ohne
        }),
    })
  }

  const frei = IDS.find((id) => !varianten.some((v) => v.id === id))
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t('preise.var.titel')}>
      {varianten.map((v) => {
        const s = summe({ ...k, variante: v.id }, satz)
        const an = (k.variante ?? varianten[0]?.id) === v.id
        return (
          <div
            key={v.id}
            className={cn(
              'flex flex-col gap-1 rounded-lg border p-2.5',
              an ? 'border-accent ring-accent bg-accent-soft/40 ring-1' : 'hover:border-border-strong',
            )}
          >
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-xs font-semibold">{v.id}</span>
              <input
                aria-label={t('preise.var.name', { id: v.id })}
                value={v.name}
                onChange={(e) => {
                  onAendern({
                    ...k,
                    varianten: varianten.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x)),
                  })
                }}
                className="hover:border-border focus-visible:border-ring min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm font-medium outline-none"
              />
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                aria-label={t('preise.var.entfernen', { id: v.id })}
                onClick={() => {
                  entferne(v.id)
                }}
              >
                <X />
              </Button>
            </div>
            {/* Eigener Knopf zum Wählen: Feld und Knopf dürfen nicht in einem anklickbaren Element stecken. */}
            <button
              type="button"
              aria-pressed={an}
              aria-label={t('preise.var.waehlen', { name: v.name || v.id, betrag: formatChf(s.total) })}
              onClick={() => {
                onAendern({ ...k, variante: v.id })
              }}
              className="focus-visible:ring-ring flex flex-col items-start gap-1 rounded text-left outline-none focus-visible:ring-2"
            >
              <span className="zahlen font-display text-lg font-semibold">CHF {formatChf(s.total)}</span>
              <span className="text-muted-foreground text-xs">
                {t('preise.var.exkl', { betrag: formatChf(s.netto) })}
                {s.proKwp ? ` · ${t('preise.var.proKwp', { betrag: formatChf(s.proKwp) })}` : ''}
              </span>
              {s.netto > 0 && (
                <Badge ton={TON[dbTon(s.dbProzent)]}>
                  {t('preise.var.marge', { prozent: Math.round(s.dbProzent * 10) / 10 })}
                </Badge>
              )}
            </button>
          </div>
        )
      })}
      {frei && varianten.length < 3 && (
        <Button
          variant="ghost"
          className="h-auto min-h-16 border border-dashed"
          onClick={() => {
            onAendern({ ...k, varianten: [...varianten, { id: frei, name: t('preise.var.standardC') }] })
          }}
        >
          <Plus />
          {t('preise.var.dazu', { id: frei })}
        </Button>
      )}
    </div>
  )
}
