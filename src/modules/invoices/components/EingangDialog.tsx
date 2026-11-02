import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { zweisprachig } from '@/services/fachfehler'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich, plusTage } from '../lib/rechnung'
import { belegHochladen, eingangSpeichern, findeNummer } from '../services/eingang'
import type { Eingangsrechnung } from '../types'

const FELDER = [
  'lieferant',
  'nummer',
  'datum',
  'faellig',
  'betrag',
  'skonto',
  'skontoBis',
  'projekt',
  'bestellung',
  'text',
] as const
type Werte = Record<(typeof FELDER)[number], string>

/**
 * Eingangsrechnung von Hand erfassen oder ändern (Recht «finanzen»), z. B. wenn sie per Post kam. Projekt und
 * Bestellung über die Nummer; daraus setzt die Datenbank das Erstvisum (Projektleitung) und ob die GL visieren muss.
 */
export function EingangDialog({
  eingang: e,
  onSchliessen,
  onGespeichert,
}: {
  eingang?: Eingangsrechnung
  onSchliessen: () => void
  onGespeichert: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const heute = heuteZuerich()
  const [w, setW] = useState<Werte>({
    lieferant: e?.lieferant ?? '',
    nummer: e?.nummer ?? '',
    datum: e?.datum ?? heute,
    faellig: e?.faellig_am ?? plusTage(heute, 30),
    betrag: e ? formatChf(e.betrag_rappen) : '',
    skonto: e?.skonto_prozent ? String(e.skonto_prozent) : '',
    skontoBis: e?.skonto_bis ?? '',
    projekt: e?.projekt_nummer ?? '',
    bestellung: e?.bestellung_nummer ?? '',
    text: e?.text ?? '',
  })
  const [datei, setDatei] = useState<File | null>(null)
  const rappen = parseChf(w.betrag)
  const d = 'rechnungen.eingang.dialog'

  const los = () =>
    void aus(async () => {
      const projekt = w.projekt.trim() ? await findeNummer('projekte', w.projekt) : null
      if (w.projekt.trim() && !projekt) {
        melde('warnung', zweisprachig(`${d}.projektUnbekannt`, { nummer: w.projekt }))
        return
      }
      const bestellung = w.bestellung.trim() ? await findeNummer('bestellungen', w.bestellung) : null
      if (w.bestellung.trim() && !bestellung) {
        melde('warnung', zweisprachig(`${d}.bestellungUnbekannt`, { nummer: w.bestellung }))
        return
      }
      const dokument = datei ? await belegHochladen(datei) : undefined
      const id = await eingangSpeichern(e?.id ?? null, {
        lieferant: w.lieferant,
        nummer: w.nummer,
        datum: w.datum,
        faellig_am: w.faellig,
        betrag_rappen: rappen ?? 0,
        skonto_prozent: w.skonto,
        skonto_bis: w.skontoBis,
        projekt_id: projekt?.id ?? null,
        bestellung_id: bestellung?.id ?? null,
        ...(dokument ? { dokument_id: dokument } : {}),
        text: w.text,
      })
      melde('ok', { de: 'Gespeichert', fr: 'Enregistré' })
      onGespeichert(id)
    })

  const typ: Partial<Record<(typeof FELDER)[number], string>> = { datum: 'date', faellig: 'date', skontoBis: 'date' }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={e ? t(`${d}.aendern`) : t(`${d}.titel`)}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} disabled={!w.lieferant.trim() || !rappen || rappen <= 0} onClick={los}>
              {t(`${d}.speichern`)}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FELDER.map((f) => (
            <Feld
              key={f}
              id={`eingang-${f}`}
              label={t(`${d}.${f}`)}
              pflicht={f === 'lieferant' || f === 'betrag'}
              {...(f === 'lieferant' || f === 'text' ? { className: 'sm:col-span-2' } : {})}
            >
              <Input
                id={`eingang-${f}`}
                type={typ[f] ?? 'text'}
                {...(f === 'betrag' || f === 'skonto' ? { inputMode: 'decimal' as const } : {})}
                value={w[f]}
                onChange={(x) => {
                  setW({ ...w, [f]: x.target.value })
                }}
              />
            </Feld>
          ))}
          <Feld id="eingang-beleg" label={t(`${d}.beleg`)} className="sm:col-span-2">
            <Input
              id="eingang-beleg"
              type="file"
              accept="application/pdf,image/*"
              onChange={(x) => {
                setDatei(x.target.files?.[0] ?? null)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
