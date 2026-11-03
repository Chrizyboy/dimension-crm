import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel } from '@/services/fachfehler'
import { useOffertAenderung } from '../hooks/useOfferten'
import { setzeAngaben } from '../services/ablauf'
import type { Offerte, OffertVariante } from '../types'

interface Zeile {
  k: string
  titel: string
  betrag: string
  kwp: string
  batterie: string
}

const KENNUNGEN = ['A', 'B', 'C', 'D']

function zuZeile(v: OffertVariante): Zeile {
  return {
    k: v.k,
    titel: v.titel ?? '',
    betrag: v.betragRappen === null ? '' : formatChf(v.betragRappen),
    kwp: v.kwp === null ? '' : String(v.kwp),
    batterie: v.batterie ?? '',
  }
}

/** Varianten erfassen oder ändern (höchstens vier, A bis D), Betrag exkl. MWST wie im Eturnity-PDF. */
export default function VariantenDialog({ o, onSchliessen }: { o: Offerte; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const [zeilen, setZeilen] = useState<Zeile[]>(
    o.varianten.length
      ? o.varianten.map(zuZeile)
      : [
          {
            k: 'A',
            titel: t('offerten.varianten.vorschlagA'),
            betrag: o.betragRappen ? formatChf(o.betragRappen) : '',
            kwp: o.kwp ? String(o.kwp) : '',
            batterie: o.batterie ?? '',
          },
        ],
  )
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useOffertAenderung(() =>
    setzeAngaben(o.id, {
      varianten: zeilen
        .filter((z) => z.titel.trim() || z.betrag.trim())
        .map((z) => ({
          k: z.k,
          titel: z.titel.trim() || null,
          betragRappen: parseChf(z.betrag),
          kwp: z.kwp.trim() ? Number(z.kwp.replace(',', '.')) : null,
          batterie: z.batterie.trim() || null,
          text: null,
        })),
    }),
  )
  function aendere(i: number, feld: keyof Zeile, wert: string) {
    setZeilen(zeilen.map((z, j) => (j === i ? { ...z, [feld]: wert } : z)))
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('offerten.varianten.titel')}
        beschreibung={`${o.nummer} · ${o.name}`}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={speichern.isPending}
              onClick={() => {
                setFehler(null)
                speichern.mutate(undefined, {
                  onSuccess: onSchliessen,
                  onError: (f) => {
                    const s = fachFehlerSchluessel(f)
                    if (!s) meldeFehler(f, 'offerten.varianten')
                    setFehler(t(s ?? 'fachfehler.allgemein'))
                  },
                })
              }}
            >
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {zeilen.map((z, i) => (
            <fieldset
              key={z.k}
              className="grid grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-[2rem_1fr_8rem_5rem_1fr_auto]"
            >
              <legend className="sr-only">{t('offerten.varianten.variante', { k: z.k })}</legend>
              <span className="self-center font-semibold">{z.k}</span>
              <Input
                aria-label={t('offerten.varianten.feldTitel')}
                placeholder={t('offerten.varianten.feldTitel')}
                value={z.titel}
                onChange={(e) => {
                  aendere(i, 'titel', e.target.value)
                }}
              />
              <Input
                aria-label={t('offerten.varianten.feldBetrag')}
                placeholder={t('offerten.varianten.feldBetrag')}
                inputMode="decimal"
                value={z.betrag}
                onChange={(e) => {
                  aendere(i, 'betrag', e.target.value)
                }}
              />
              <Input
                aria-label="kWp"
                placeholder="kWp"
                inputMode="decimal"
                value={z.kwp}
                onChange={(e) => {
                  aendere(i, 'kwp', e.target.value)
                }}
              />
              <Input
                aria-label={t('offerten.akte.batterie')}
                placeholder={t('offerten.akte.batterie')}
                value={z.batterie}
                onChange={(e) => {
                  aendere(i, 'batterie', e.target.value)
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={t('offerten.varianten.entfernen', { k: z.k })}
                onClick={() => {
                  setZeilen(zeilen.filter((_, j) => j !== i).map((x, j) => ({ ...x, k: KENNUNGEN[j] ?? x.k })))
                }}
              >
                <Trash2 />
              </Button>
            </fieldset>
          ))}
          {zeilen.length < 4 && (
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => {
                setZeilen([
                  ...zeilen,
                  { k: KENNUNGEN[zeilen.length] ?? 'D', titel: '', betrag: '', kwp: '', batterie: '' },
                ])
              }}
            >
              <Plus />
              {t('offerten.varianten.neu')}
            </Button>
          )}
          {fehler && (
            <p role="alert" className="text-bad text-sm">
              {fehler}
            </p>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
