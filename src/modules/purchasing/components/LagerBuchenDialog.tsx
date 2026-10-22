import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { alsZahl, formatMenge } from '../lib/anzeige'
import { lagerBuchen, mindestmengeSetzen } from '../services/lager'
import type { ArtikelTreffer, LagerZeile } from '../types'
import { ArtikelWahl } from './ArtikelWahl'

const ARTEN = ['eingang', 'entnahme', 'korrektur', 'inventur'] as const
type Art = (typeof ARTEN)[number]

/**
 * Lager buchen ohne Bestellung: Eingang, Entnahme, Korrektur (+/−) oder Inventur (gezählter Bestand).
 * Jede Buchung steht als Bewegung im Protokoll. Dazu die Mindestmenge für die Warnung «nachbestellen».
 */
export function LagerBuchenDialog({
  lagerortId,
  zeile,
  onSchliessen,
}: {
  lagerortId: string
  zeile: LagerZeile | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [artikel, setArtikel] = useState<ArtikelTreffer | null>(null)
  const [art, setArt] = useState<Art>('eingang')
  const [menge, setMenge] = useState('')
  const [notiz, setNotiz] = useState('')
  const [mindest, setMindest] = useState(zeile?.mindestmenge === null || !zeile ? '' : formatMenge(zeile.mindestmenge))
  const artikelId = zeile?.artikel_id ?? artikel?.id ?? null
  const n = alsZahl(menge)
  const m = alsZahl(mindest)
  const mindestNeu = zeile && m !== zeile.mindestmenge && (mindest.trim() === '' || (m !== null && m >= 0))
  const buchungGueltig = n !== null && (art === 'korrektur' ? n !== 0 : art === 'inventur' ? n >= 0 : n > 0)

  async function speichern() {
    const ok = await aus(
      async () => {
        if (artikelId && buchungGueltig) {
          await lagerBuchen({ art, lagerort_id: lagerortId, artikel_id: artikelId, menge: n, notiz: notiz.trim() })
        }
        if (zeile && mindestNeu) await mindestmengeSetzen(zeile.id, mindest.trim() === '' ? null : m)
      },
      { de: 'Gebucht', fr: 'Enregistré' },
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
        titel={zeile ? zeile.artikel : t('einkauf.lager.buchen')}
        beschreibung={
          zeile
            ? t('einkauf.lager.stand', {
                bestand: formatMenge(zeile.menge),
                reserviert: formatMenge(zeile.reserviert),
                einheit: zeile.einheit,
              })
            : t('einkauf.lager.buchenText')
        }
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              onClick={() => void speichern()}
              laedt={laeuft}
              disabled={!artikelId || (!buchungGueltig && !mindestNeu)}
            >
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {!zeile && (
            <Feld id="lb-artikel" label={t('einkauf.zeile.artikel')} pflicht>
              {artikel ? (
                <p className="bg-muted/50 rounded-md border px-2.5 py-1.5 text-sm">{artikel.name}</p>
              ) : (
                <ArtikelWahl id="lb-artikel" onWahl={setArtikel} onFrei={() => undefined} />
              )}
            </Feld>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Feld id="lb-art" label={t('einkauf.lager.art')}>
              <Auswahl
                id="lb-art"
                value={art}
                onValueChange={(w) => {
                  setArt(w as Art)
                }}
                optionen={ARTEN.map((a) => ({ wert: a, text: t(`einkauf.lager.arten.${a}`) }))}
              />
            </Feld>
            <Feld
              id="lb-menge"
              label={art === 'inventur' ? t('einkauf.lager.gezaehlt') : t('einkauf.zeile.menge')}
              {...(art === 'korrektur' ? { hinweis: t('einkauf.lager.korrekturHinweis') } : {})}
            >
              <Input
                id="lb-menge"
                inputMode="decimal"
                value={menge}
                onChange={(e) => {
                  setMenge(e.target.value)
                }}
              />
            </Feld>
          </div>
          <Feld id="lb-notiz" label={t('einkauf.feld.notiz')}>
            <Input
              id="lb-notiz"
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
          {zeile && (
            <Feld id="lb-mindest" label={t('einkauf.lager.mindest')} hinweis={t('einkauf.lager.mindestHinweis')}>
              <Input
                id="lb-mindest"
                inputMode="decimal"
                className="w-32"
                value={mindest}
                onChange={(e) => {
                  setMindest(e.target.value)
                }}
              />
            </Feld>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
