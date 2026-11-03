import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Auswahl } from '@/components/ui/auswahl'
import { Checkbox } from '@/components/ui/schalter'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuswahl } from '@/hooks/useAuswahl'
import type { ImportErgebnis, PreisImport } from '../types'

/** Reihenfolge: geändert (grösste Änderung zuerst), neu, fehlt, gleich. */
const RANG = { geaendert: 0, neu: 1, fehlt: 2, gleich: 3 } as const

function prozent(z: ImportErgebnis): number | null {
  if (!z.ek_alt || z.ek_neu === undefined) return null
  return Math.round(((z.ek_neu - z.ek_alt) / z.ek_alt) * 1000) / 10
}

/**
 * Zeilen einer eingelesenen Preisliste: alt/neu, Änderung in Prozent (teurer rot, günstiger grün), neuer
 * Verkaufspreis und betroffene offene Offerten. Gleiche Preise sind eingeklappt, damit das Wichtige oben steht.
 */
export function ImportTabelle({
  imp,
  auswahl,
  kategorien,
  onAuswahl,
  onKategorie,
  onArtikel,
}: {
  imp: PreisImport
  auswahl: Set<number>
  kategorien: Record<number, string>
  onAuswahl: (s: Set<number>) => void
  onKategorie: (i: number, kategorie: string) => void
  onArtikel: (id: string) => void
}) {
  const { t } = useTranslation()
  const kat = useAuswahl('artikelkategorie')
  const offen = imp.status === 'offen'
  const zeilen = imp.ergebnis
    .filter((z) => z.art !== 'gleich')
    .sort((a, b) => RANG[a.art] - RANG[b.art] || Math.abs(prozent(b) ?? 0) - Math.abs(prozent(a) ?? 0))
  const gleich = imp.ergebnis.length - zeilen.length
  const geaendert = zeilen.filter((z) => z.art === 'geaendert')
  const alle = geaendert.length > 0 && geaendert.every((z) => auswahl.has(z.i))

  if (zeilen.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t('preise.aenderungen.nichts')}
      </p>
    )
  }
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[52rem] text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="w-8 py-1.5">
              {offen && geaendert.length > 0 && (
                <Checkbox
                  aria-label={t('preise.aenderungen.alle')}
                  checked={alle}
                  onCheckedChange={(c) => {
                    onAuswahl(new Set(c === true ? geaendert.map((z) => z.i) : []))
                  }}
                />
              )}
            </th>
            <th className="py-1.5 font-medium">{t('preise.spalte.artikel')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.aenderungen.ekAlt')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.aenderungen.ekNeu')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.aenderungen.prozent')}</th>
            <th className="py-1.5 text-right font-medium">{t('preise.aenderungen.vkNeu')}</th>
            <th className="py-1.5 pl-3 font-medium">{t('preise.aenderungen.offerten')}</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => {
            const p = prozent(z)
            return (
              <tr key={z.i} className={cn('border-b last:border-b-0', z.art === 'fehlt' && 'text-muted-foreground')}>
                <td className="py-1.5 align-top">
                  {offen && z.art === 'geaendert' && (
                    <Checkbox
                      aria-label={t('preise.aenderungen.waehlen', { name: z.name ?? z.artikelnummer ?? '' })}
                      checked={auswahl.has(z.i)}
                      onCheckedChange={(c) => {
                        const n = new Set(auswahl)
                        if (c === true) n.add(z.i)
                        else n.delete(z.i)
                        onAuswahl(n)
                      }}
                    />
                  )}
                </td>
                <td className="py-1.5 pr-2 align-top">
                  <span className="flex flex-col">
                    {z.artikel_id ? (
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() => {
                          if (z.artikel_id) onArtikel(z.artikel_id)
                        }}
                      >
                        {z.name ?? z.artikelnummer}
                      </button>
                    ) : (
                      <span className="font-medium">{z.name ?? z.artikelnummer}</span>
                    )}
                    <span className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
                      {z.art !== 'geaendert' && (
                        <Badge ton={z.art === 'neu' ? 'info' : 'neutral'}>{t(`preise.aenderungen.art.${z.art}`)}</Badge>
                      )}
                      {[z.artikelnummer, z.lieferant, z.hersteller].filter(Boolean).join(' · ')}
                    </span>
                    {offen && z.art === 'neu' && (
                      <Auswahl
                        aria-label={t('preise.aenderungen.kategorie', { name: z.name ?? '' })}
                        platzhalter={t('preise.aenderungen.kategorieWaehlen')}
                        className="mt-1 max-w-56"
                        value={kategorien[z.i] ?? ''}
                        onValueChange={(k) => {
                          onKategorie(z.i, k)
                        }}
                        optionen={kat.werte.map((k) => ({ wert: k.schluessel, text: kat.text(k.schluessel) }))}
                      />
                    )}
                  </span>
                </td>
                <td className="zahlen py-1.5 text-right align-top font-mono text-[13px]">
                  {z.ek_alt === undefined ? '–' : formatChf(z.ek_alt)}
                </td>
                <td className="zahlen py-1.5 text-right align-top font-mono text-[13px] font-medium">
                  {z.ek_neu === undefined ? t('preise.aenderungen.nichtMehr') : formatChf(z.ek_neu)}
                </td>
                <td
                  className={cn(
                    'zahlen py-1.5 text-right align-top font-mono text-[13px]',
                    p !== null && (p > 0 ? 'text-bad' : 'text-ok'),
                  )}
                >
                  {p === null ? '–' : `${p > 0 ? '+' : ''}${p} %`}
                </td>
                <td className="zahlen py-1.5 text-right align-top font-mono text-[13px]">
                  {z.vk_neu === undefined ? '–' : formatChf(z.vk_neu)}
                </td>
                <td className="py-1.5 pl-3 align-top text-xs">
                  {z.offerten?.length ? (
                    <span className="flex flex-wrap gap-1">
                      {z.offerten.map((o) => (
                        <Badge key={o} ton="warnung">
                          {o}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    '–'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {gleich > 0 && (
        <p className="text-muted-foreground mt-2 text-xs">{t('preise.aenderungen.gleich', { n: gleich })}</p>
      )}
    </div>
  )
}
