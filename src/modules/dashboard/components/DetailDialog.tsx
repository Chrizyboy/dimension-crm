import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { zielVon } from '@/lib/ziel'
import { summe, tabelleVon } from '../lib/auswertung'
import type { Detail } from '../types'

/**
 * Was hinter einer Zahl steht (V233 Drill-down): Liste mit Total, ein Klick öffnet Lead, Offerte, Projekt oder Fall.
 */
export function DetailDialog({ detail, onSchliessen }: { detail: Detail; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const zeilen = [...detail.fakten].sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? ''))
  const mitBetrag = zeilen.some((f) => f.betrag_rappen !== null)

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={detail.titel}
        beschreibung={t('kz.detail.anzahl', { count: zeilen.length })}
        className="md:w-[40rem]"
      >
        {zeilen.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('kz.detail.leer')}</p>
        ) : (
          <Tabelle aria-label={detail.titel}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('kz.detail.datum')}</Kopfzelle>
                <Kopfzelle>{t('kz.detail.name')}</Kopfzelle>
                <Kopfzelle className="hidden sm:table-cell">{t('kz.detail.ort')}</Kopfzelle>
                {mitBetrag && <Kopfzelle zahl>{t('kz.detail.betrag')}</Kopfzelle>}
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {zeilen.map((f, i) => {
                const ziel = zielVon(tabelleVon(f.art), f.id)
                return (
                  <Zeile
                    key={`${f.id}-${String(i)}`}
                    className={ziel ? 'cursor-pointer' : undefined}
                    tabIndex={ziel ? 0 : undefined}
                    onClick={() => {
                      if (ziel) void navigate({ href: ziel })
                    }}
                    onKeyDown={(e) => {
                      if (ziel && e.key === 'Enter') void navigate({ href: ziel })
                    }}
                  >
                    <Zelle className="zahlen text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {f.datum ? formatDatum(f.datum) : '–'}
                    </Zelle>
                    <Zelle>
                      <span className="flex flex-col">
                        <span className="font-medium">{f.name ?? '–'}</span>
                        {f.nummer && <span className="text-muted-foreground font-mono text-xs">{f.nummer}</span>}
                      </span>
                    </Zelle>
                    <Zelle className="text-muted-foreground hidden text-xs sm:table-cell">{f.ort}</Zelle>
                    {mitBetrag && (
                      <Zelle zahl className="font-mono">
                        {f.betrag_rappen !== null ? formatChf(f.betrag_rappen) : ''}
                      </Zelle>
                    )}
                  </Zeile>
                )
              })}
              {mitBetrag && (
                <Zeile className="bg-surface-2 font-semibold">
                  <Zelle colSpan={2}>{t('kz.detail.total')}</Zelle>
                  <Zelle className="hidden sm:table-cell" />
                  <Zelle zahl className="font-mono">
                    {formatChf(summe(zeilen))}
                  </Zelle>
                </Zeile>
              )}
            </TabelleKoerper>
          </Tabelle>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
