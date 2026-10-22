import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatChf, parseChf } from '@/lib/format'
import { zeile } from '../lib/kalkulation'
import { leseProzent, prozentText } from '../lib/prozent'
import type { KalkPosition, Kalkulation } from '../types'
import { PreisFeld } from './PreisFeld'

/** Positionen der Kalkulation: Menge, EK und Marge änderbar, Preis und Total gerechnet (V233 pcLine). */
export function KalkPositionen({ k, onAendern }: { k: Kalkulation; onAendern: (k: Kalkulation) => void }) {
  const { t } = useTranslation()
  const setze = (p: KalkPosition, w: Partial<KalkPosition>) => {
    onAendern({ ...k, positionen: k.positionen.map((x) => (x.key === p.key ? { ...x, ...w } : x)) })
  }
  if (k.positionen.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t('preise.kalk.leer')}
      </p>
    )
  }
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="py-1.5 font-medium">{t('preise.kalk.position')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.kalk.menge')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.spalte.ek')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.spalte.marge')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.kalk.preis')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.kalk.total')}</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {k.positionen.map((p) => {
            const z = zeile(p)
            return (
              <tr key={p.key} className="border-b last:border-b-0">
                <td className="py-1 pr-2">
                  {p.frei ? (
                    <input
                      aria-label={t('preise.kalk.position')}
                      value={p.name}
                      onChange={(e) => {
                        setze(p, { name: e.target.value })
                      }}
                      className="hover:border-border focus-visible:border-ring h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-sm font-medium outline-none"
                    />
                  ) : (
                    <span className="flex min-w-0 flex-col">
                      <span className="max-w-[20rem] truncate font-medium" title={p.name}>
                        {p.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {[p.gruppe, p.artikelnummer, p.wp ? `${p.wp} Wp` : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  )}
                </td>
                <td className="py-1 text-right whitespace-nowrap">
                  <PreisFeld
                    label={`${t('preise.kalk.menge')} ${p.name}`}
                    className="w-16"
                    wert={String(p.menge)}
                    onSpeichern={(x) => {
                      setze(p, { menge: Math.max(0, Number(x.replace(',', '.')) || 0) })
                    }}
                  />
                  <span className="text-muted-foreground text-xs">{p.einheit}</span>
                </td>
                <td className="py-1 text-right">
                  <PreisFeld
                    label={`${t('preise.spalte.ek')} ${p.name}`}
                    wert={formatChf(p.ekRappen)}
                    onSpeichern={(x) => {
                      setze(p, { ekRappen: parseChf(x) ?? 0 })
                    }}
                  />
                </td>
                <td className="py-1 text-right">
                  <PreisFeld
                    label={`${t('preise.spalte.marge')} ${p.name}`}
                    className="w-14"
                    wert={prozentText(p.marge)}
                    onSpeichern={(x) => {
                      setze(p, { marge: leseProzent(x) ?? 0 })
                    }}
                  />
                </td>
                <td className="zahlen py-1 text-right font-mono text-[13px]">{formatChf(z.preis)}</td>
                <td className="zahlen py-1 text-right font-mono text-[13px] font-medium">{formatChf(z.total)}</td>
                <td className="py-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('preise.kalk.entfernen', { name: p.name })}
                    onClick={() => {
                      onAendern({ ...k, positionen: k.positionen.filter((x) => x.key !== p.key) })
                    }}
                  >
                    <X />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
