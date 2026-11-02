import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { ladeZumVisum, visieren, type VisumRechnung } from '../services/visum'

/** Prüfen und visieren: Positionen und Beträge, «Erstvisum geben» oder «Korrektur melden» mit Hinweis. */
function VisumDialog({ r, onSchliessen }: { r: VisumRechnung; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [bemerkung, setBemerkung] = useState(r.visum_bemerkung ?? '')

  async function los(mitBemerkung: boolean) {
    const ok = await aus(
      () => visieren(r.id, mitBemerkung ? bemerkung : undefined),
      mitBemerkung
        ? { de: 'Korrektur an die Buchhaltung gemeldet', fr: 'Correction signalée à la comptabilité' }
        : { de: 'Erstvisum erteilt', fr: 'Premier visa donné' },
    )
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('rechnungen.visum.dialogTitel', { titel: r.titel ?? t(`rechnungen.art.${r.art}`) })}
        beschreibung={[r.kunde, r.projekt_nummer, r.projekt_titel].filter(Boolean).join(' · ')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button variant="secondary" onClick={() => void los(true)} laedt={laeuft} disabled={!bemerkung.trim()}>
              {t('rechnungen.visum.korrektur')}
            </Button>
            <Button onClick={() => void los(false)} laedt={laeuft}>
              {t('rechnungen.visum.geben')}
            </Button>
          </>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th className="py-1 font-medium">{t('rechnungen.visum.position')}</th>
              <th className="py-1 text-right font-medium">{t('rechnungen.visum.menge')}</th>
              <th className="py-1 text-right font-medium">{t('rechnungen.visum.betrag')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {r.positionen.map((p, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-2">{p.text}</td>
                <td className="zahlen py-1.5 text-right">
                  {p.menge} {p.einheit ?? ''}
                </td>
                <td className="zahlen py-1.5 text-right">{formatChf(Math.round(p.menge * p.preis_rappen))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t">
            <tr>
              <td colSpan={2} className="py-1.5 font-medium">
                {t('rechnungen.visum.total')}
              </td>
              <td className="zahlen py-1.5 text-right font-medium">
                {formatChf(r.total_rappen, { mitWaehrung: true })}
              </td>
            </tr>
          </tfoot>
        </table>
        <Feld id="visum-bemerkung" label={t('rechnungen.visum.bemerkung')} hinweis={t('rechnungen.visum.bemerkungText')}>
          <Textarea
            id="visum-bemerkung"
            rows={2}
            value={bemerkung}
            onChange={(e) => {
              setBemerkung(e.target.value)
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}

/**
 * «Rechnungen zum Visum» auf Mein Tag (Chris 2.11.2026): Die Projektleitung prüft die Rechnungsentwürfe ihrer
 * Projekte und gibt das Erstvisum, ohne Finanzen zu sehen; danach gibt die Buchhaltung frei.
 */
export default function VisumKarte() {
  const { t } = useTranslation()
  const liste = useQuery({ queryKey: ['rechnungen', 'visum'], queryFn: ladeZumVisum })
  const [offen, setOffen] = useState<VisumRechnung | null>(null)
  const zeilen = liste.data ?? []
  const ohne = zeilen.filter((r) => !r.visum_am).length

  if (!liste.data || zeilen.length === 0) return null
  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t('rechnungen.visum.titel')}</KarteTitel>
        <Badge ton={ohne ? 'warnung' : 'ok'}>{t('rechnungen.visum.offen', { count: ohne })}</Badge>
      </KarteKopf>
      <ul className="divide-y">
        {zeilen.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => {
                setOffen(r)
              }}
              className="hover:bg-surface-2 focus-visible:ring-ring flex w-full items-center gap-3 px-4 py-2 text-left outline-none focus-visible:ring-2"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-1 text-sm font-medium">{r.titel ?? t(`rechnungen.art.${r.art}`)}</span>
                <span className="text-muted-foreground line-clamp-1 text-xs">
                  {[r.kunde, r.projekt_nummer].filter(Boolean).join(' · ')}
                </span>
              </span>
              {r.visum_am ? (
                <Badge ton="ok">{t('rechnungen.visum.visiert', { datum: formatDatum(r.visum_am) })}</Badge>
              ) : r.visum_bemerkung ? (
                <Badge ton="warnung">{t('rechnungen.visum.korrigieren')}</Badge>
              ) : (
                <span className="zahlen text-sm">{formatChf(r.total_rappen, { mitWaehrung: true })}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {offen && (
        <VisumDialog
          r={offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </Karte>
  )
}
