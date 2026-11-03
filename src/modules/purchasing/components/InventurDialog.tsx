import { ClipboardCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { alsZahl, formatMenge } from '../lib/anzeige'
import { inventurAbweichungen } from '../lib/lagerTypen'
import { inventurBuchen } from '../services/lager'
import type { LagerZeile } from '../types'

/**
 * Inventur in einem Durchgang: Liste nach Lagerplatz, je Artikel den gezählten Bestand eintragen. Gebucht werden
 * nur Abweichungen (als Korrektur mit Notiz «Inventur»); leere Felder bleiben, wie sie sind.
 */
export function InventurDialog({
  lagerortId,
  zeilen,
  onSchliessen,
}: {
  lagerortId: string
  zeilen: LagerZeile[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [eingabe, setEingabe] = useState<Record<string, string>>({})
  const [notiz, setNotiz] = useState(t('einkauf.inventur.notizVorschlag', { jahr: new Date().getFullYear() }))
  const sortiert = useMemo(
    () =>
      zeilen
        .filter((z) => z.lagerort_id === lagerortId)
        .toSorted(
          (a, b) => (a.lagerplatz ?? '~').localeCompare(b.lagerplatz ?? '~') || a.artikel.localeCompare(b.artikel),
        ),
    [zeilen, lagerortId],
  )
  const gezaehlt = Object.fromEntries(Object.entries(eingabe).map(([k, v]) => [k, v.trim() === '' ? null : alsZahl(v)]))
  const abweichungen = inventurAbweichungen(sortiert, gezaehlt)

  async function buchen() {
    const ok = await aus(async () => {
      const n = await inventurBuchen(
        lagerortId,
        abweichungen.map(({ artikel_id, menge }) => ({ artikel_id, menge })),
        notiz.trim(),
      )
      melde('ok', { de: `${String(n)} Korrekturen gebucht`, fr: `${String(n)} correction(s) enregistrée(s)` })
    })
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
        className="sm:max-w-3xl"
        titel={t('einkauf.inventur.titel')}
        beschreibung={t('einkauf.inventur.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} disabled={abweichungen.length === 0} onClick={() => void buchen()}>
              <ClipboardCheck />
              {t('einkauf.inventur.buchen', { count: abweichungen.length })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="inv-notiz" label={t('einkauf.feld.notiz')}>
            <Input
              id="inv-notiz"
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
          <Tabelle>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('einkauf.lager.platz')}</Kopfzelle>
                <Kopfzelle>{t('einkauf.lager.artikel')}</Kopfzelle>
                <Kopfzelle zahl>{t('einkauf.inventur.soll')}</Kopfzelle>
                <Kopfzelle zahl>{t('einkauf.lager.gezaehlt')}</Kopfzelle>
                <Kopfzelle zahl>{t('einkauf.inventur.differenz')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {sortiert.map((z) => {
                const g = gezaehlt[z.artikel_id]
                const diff = g === null || g === undefined ? null : g - z.menge
                return (
                  <Zeile key={z.id}>
                    <Zelle className="font-mono text-xs">{z.lagerplatz ?? '–'}</Zelle>
                    <Zelle>
                      <span className="line-clamp-2 max-w-[20rem]">{z.artikel}</span>
                    </Zelle>
                    <Zelle zahl>
                      {formatMenge(z.menge)} <span className="text-muted-foreground text-xs">{z.einheit}</span>
                    </Zelle>
                    <Zelle zahl className="py-1">
                      <Input
                        inputMode="decimal"
                        className="ml-auto h-8 w-20 text-right"
                        aria-label={t('einkauf.inventur.gezaehltFuer', { name: z.artikel })}
                        value={eingabe[z.artikel_id] ?? ''}
                        onChange={(e) => {
                          setEingabe((alt) => ({ ...alt, [z.artikel_id]: e.target.value }))
                        }}
                      />
                    </Zelle>
                    <Zelle zahl>
                      {diff === null || diff === 0 ? (
                        <span className="text-muted-foreground">{diff === 0 ? '0' : '–'}</span>
                      ) : (
                        <Badge ton={diff < 0 ? 'kritisch' : 'info'}>
                          {diff > 0 ? '+' : ''}
                          {formatMenge(diff)}
                        </Badge>
                      )}
                    </Zelle>
                  </Zeile>
                )
              })}
            </TabelleKoerper>
          </Tabelle>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
