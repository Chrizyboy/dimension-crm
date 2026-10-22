import { FilePlus2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { formatChf, parseChf } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useOffertAenderung } from '../hooks/useOfferten'
import { leseEturnityOfferte } from '../lib/eturnity'
import { heuteIso } from '../lib/nachfassen'
import { pdfZeilen } from '../lib/pdfText'
import { erfasseVersion, legePdfAb } from '../services/offerten'
import type { Offerte } from '../types'

/**
 * «Überarbeitete Version erfassen» (V67): Datum, Betrag exkl. MWST, kWp, Batterie, «Was wurde geändert?»
 * und das PDF. Ein Eturnity-PDF füllt die Zahlen gleich aus. «Als aktuelle Offerte übernehmen» setzt
 * die Werte und das Datum und lässt das Nachfassen neu beginnen.
 */
export default function VersionDialog({ o, onSchliessen }: { o: Offerte; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const [datum, setDatum] = useState(heuteIso())
  const [betrag, setBetrag] = useState(o.betragRappen ? formatChf(o.betragRappen) : '')
  const [kwp, setKwp] = useState(o.kwp ? String(o.kwp) : '')
  const [batterie, setBatterie] = useState(o.batterie ?? '')
  const [text, setText] = useState('')
  const [datei, setDatei] = useState<File | null>(null)
  const [uebernehmen, setUebernehmen] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useOffertAenderung(async () => {
    const dokument = datei ? await legePdfAb(o, datei) : undefined
    return erfasseVersion(o.id, {
      datum,
      text,
      betrag_rappen: parseChf(betrag),
      kwp: kwp ? Number(kwp.replace(',', '.')) : null,
      batterie,
      uebernehmen,
      ...(dokument ? { dokument } : {}),
    })
  })

  async function nimmPdf(f: File | undefined) {
    if (!f) return
    setDatei(f)
    try {
      const w = leseEturnityOfferte(await pdfZeilen(f))
      if (w.betragRappen) setBetrag(formatChf(w.betragRappen))
      if (w.kwp) setKwp(String(w.kwp))
      if (w.batterie) setBatterie(w.batterie)
      if (w.datum) setDatum(w.datum)
    } catch (e) {
      // Ein PDF, das nicht von Eturnity stammt, wird trotzdem abgelegt; nur das Ausfüllen entfällt.
      meldeFehler(e, 'offerten.version.pdf')
    }
  }

  async function absenden() {
    setFehler(null)
    if (!text.trim()) {
      setFehler(t('fachfehler.offerte_text_fehlt'))
      return
    }
    try {
      const n = await speichern.mutateAsync(undefined)
      melde('ok', zweisprachig('offerten.versionen.gespeichert', { v: n }))
      onSchliessen()
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'offerten.version')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('offerten.versionen.neu')}
        beschreibung={`${o.nummer} · ${o.name}`}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <FilePlus2 />
              {t('offerten.versionen.speichern')}
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void absenden()
          }}
        >
          <Feld id="version-pdf" label={t('offerten.versionen.pdf')} hinweis={t('offerten.versionen.pdfHinweis')}>
            <Input
              id="version-pdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => void nimmPdf(e.target.files?.[0])}
            />
          </Feld>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld id="version-datum" label={t('offerten.versionen.datum')} pflicht>
              <Input
                id="version-datum"
                type="date"
                value={datum}
                onChange={(e) => {
                  setDatum(e.target.value)
                }}
              />
            </Feld>
            <Feld id="version-betrag" label={t('offerten.versionen.betrag')} hinweis="CHF 12'500.00">
              <Input
                id="version-betrag"
                inputMode="decimal"
                value={betrag}
                onChange={(e) => {
                  setBetrag(e.target.value)
                }}
              />
            </Feld>
            <Feld id="version-kwp" label="kWp">
              <Input
                id="version-kwp"
                inputMode="decimal"
                value={kwp}
                onChange={(e) => {
                  setKwp(e.target.value)
                }}
              />
            </Feld>
            <Feld id="version-batterie" label={t('offerten.akte.batterie')}>
              <Input
                id="version-batterie"
                value={batterie}
                onChange={(e) => {
                  setBatterie(e.target.value)
                }}
              />
            </Feld>
          </div>
          <Feld id="version-text" label={t('offerten.versionen.text')} pflicht fehler={fehler ?? undefined}>
            <Textarea
              id="version-text"
              rows={3}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
              }}
            />
          </Feld>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={uebernehmen}
              onCheckedChange={(an) => {
                setUebernehmen(an === true)
              }}
            />
            {t('offerten.versionen.uebernehmen')}
          </label>
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
