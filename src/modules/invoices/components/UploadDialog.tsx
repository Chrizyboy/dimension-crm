import { CalendarRange, FileText, FolderOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum, parseChf } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/rechnung'
import { ablageJahr, abgrenzung, eingangDateiname } from '../lib/eingangName'
import { eingangHochladen, type GelesenRechnung } from '../services/eingang'
import type { Eingangsrechnung } from '../types'

const FELDER = [
  'lieferant',
  'nummer',
  'datum',
  'grund',
  'betrag',
  'mwst',
  'faellig',
  'skonto',
  'skontoBis',
  'periodeVon',
  'periodeBis',
  'iban',
  'referenz',
  'text',
] as const
type Name = (typeof FELDER)[number]
type Werte = Record<Name, string>
const DATUM: Name[] = ['datum', 'faellig', 'skontoBis', 'periodeVon', 'periodeBis']
const BREIT: Name[] = ['lieferant', 'text']

function startwerte(e: Eingangsrechnung | undefined, g: GelesenRechnung | null, heute: string): Werte {
  const chf = (r: number | null | undefined) => (r ? formatChf(r) : '')
  return {
    lieferant: e?.lieferant ?? g?.lieferant ?? '',
    nummer: e?.nummer ?? g?.nummer ?? '',
    datum: e?.datum ?? g?.datum ?? heute,
    grund: e?.grund ?? g?.grund ?? '',
    betrag: chf(e?.betrag_rappen ?? g?.betrag_rappen),
    mwst: chf(e?.mwst_rappen ?? g?.mwst_rappen),
    faellig: e?.faellig_am ?? g?.faellig_am ?? '',
    skonto: String(e?.skonto_prozent ?? g?.skonto_prozent ?? ''),
    skontoBis: e?.skonto_bis ?? g?.skonto_bis ?? '',
    periodeVon: e?.periode_von ?? g?.periode_von ?? '',
    periodeBis: e?.periode_bis ?? g?.periode_bis ?? '',
    iban: e?.iban ?? g?.iban ?? '',
    referenz: e?.referenz ?? g?.referenz ?? '',
    text: e?.text ?? g?.bemerkung ?? '',
  }
}

/**
 * Hochgeladene Rechnung prüfen und speichern: Felder aus dem PDF (Vorschlag der KI) oder von Hand, darunter
 * Dateiname, Ablageort in Compta und ob eine Abgrenzung nötig ist. Auch zum Korrigieren beim Freigeben.
 */
export function UploadDialog({
  datei,
  dokumentId,
  gelesen = null,
  eingang,
  onSchliessen,
  onGespeichert,
}: {
  datei?: File
  dokumentId?: string
  gelesen?: GelesenRechnung | null
  eingang?: Eingangsrechnung
  onSchliessen: () => void
  onGespeichert: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const heute = heuteZuerich()
  const [w, setW] = useState<Werte>(() => startwerte(eingang, gelesen, heute))
  const d = 'rechnungen.eingang.upload'
  const rappen = parseChf(w.betrag)

  const name = eingangDateiname(w.datum, w.lieferant, w.nummer, w.grund)
  const jahr = ablageJahr(w.datum, w.periodeVon, heute)
  const ab = useMemo(
    () => abgrenzung(w.datum, w.periodeVon, w.periodeBis, rappen ?? 0),
    [w.datum, w.periodeVon, w.periodeBis, rappen],
  )

  const speichern = () =>
    void aus(async () => {
      const id = await eingangHochladen(eingang?.id ?? null, {
        lieferant: w.lieferant,
        nummer: w.nummer,
        datum: w.datum,
        faellig_am: w.faellig,
        betrag_rappen: rappen ?? 0,
        mwst_rappen: parseChf(w.mwst),
        skonto_prozent: w.skonto,
        skonto_bis: w.skontoBis,
        iban: w.iban,
        referenz: w.referenz,
        grund: w.grund,
        periode_von: w.periodeVon,
        periode_bis: w.periodeBis,
        text: w.text,
        dokument_id: dokumentId ?? eingang?.dokument_id ?? null,
      })
      melde('ok', eingang ? { de: 'Gespeichert', fr: 'Enregistré' } : { de: 'Zur Freigabe', fr: 'À valider' })
      onGespeichert(id)
    })

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        breite="breit"
        titel={eingang ? t(`${d}.aendern`) : t(`${d}.titel`)}
        {...(eingang ? {} : { beschreibung: gelesen ? t(`${d}.gelesen`) : t(`${d}.vonHand`) })}
        fuss={
          <>
            {datei && (
              <Button
                variant="ghost"
                onClick={() => {
                  // Link gilt nur für diesen Klick; der Browser gibt ihn nach einer Minute frei.
                  const url = URL.createObjectURL(datei)
                  window.open(url, '_blank', 'noopener')
                  setTimeout(() => {
                    URL.revokeObjectURL(url)
                  }, 60_000)
                }}
              >
                <FileText />
                {t(`${d}.pdf`)}
              </Button>
            )}
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} disabled={!w.lieferant.trim() || !rappen || rappen <= 0} onClick={speichern}>
              {eingang ? t(`${d}.speichern`) : t(`${d}.zurFreigabe`)}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {FELDER.map((f) => (
              <Feld
                key={f}
                id={`upload-${f}`}
                label={t(`${d}.${f}`)}
                pflicht={f === 'lieferant' || f === 'betrag'}
                {...(BREIT.includes(f) ? { className: 'sm:col-span-2' } : {})}
              >
                <Input
                  id={`upload-${f}`}
                  type={DATUM.includes(f) ? 'date' : 'text'}
                  {...(f === 'betrag' || f === 'mwst' || f === 'skonto' ? { inputMode: 'decimal' as const } : {})}
                  value={w[f]}
                  onChange={(x) => {
                    setW({ ...w, [f]: x.target.value })
                  }}
                />
              </Feld>
            ))}
          </div>
          <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-3 text-sm">
            <p className="flex items-start gap-2">
              <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 font-medium break-words">{name}</span>
            </p>
            <p className="text-muted-foreground flex items-start gap-2">
              <FolderOpen className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t(`${d}.ablage`, { jahr })}
            </p>
            {ab?.noetig && (
              <p className="text-warn flex items-start gap-2">
                <CalendarRange className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {t(`${d}.abgrenzung`, {
                    von: formatDatum(w.periodeVon),
                    bis: formatDatum(w.periodeBis),
                    jahr: ab.buchungsjahr,
                  })}{' '}
                  {ab.jahre.map((j) => `${String(j.jahr)}: ${formatChf(j.rappen, { mitWaehrung: true })}`).join(' · ')}
                </span>
              </p>
            )}
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
