import { FileUp, Upload } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { formatChf } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useImporte, useLieferanten, usePreisAenderung } from '../hooks/usePreise'
import {
  IMPORT_FELDER,
  erkenneSpalten,
  findeKopfzeile,
  leseCsv,
  leseZeilen,
  type ImportFeld,
  type Zuordnung,
} from '../lib/preisDatei'
import { legeImportAn } from '../services/importe'

type Blatt = (string | number | boolean | Date | null)[][]
const ETURNITY = 'eturnity'
const NEU = 'neu'
const KEINE = '-'

/** Zuordnung des letzten Imports derselben Quelle (Feld → Überschrift) auf die neue Kopfzeile legen. */
function ausVorlage(kopf: readonly unknown[], vorlage: Record<string, string> | undefined): Zuordnung {
  const z = erkenneSpalten(kopf as Blatt[number])
  if (!vorlage) return z
  for (const f of IMPORT_FELDER) {
    const i = kopf.findIndex((k) => String((k as string | number | null) ?? '').trim() === vorlage[f])
    if (i >= 0) z[f] = i
  }
  return z
}

/**
 * Preisliste einlesen (P1/P2): Export der Eturnity-Komponenten oder Datei eines Lieferanten (Krannich, Solarmarkt,
 * Tritec …) als Excel oder CSV. Spalten werden erkannt und sind änderbar; die Datenbank vergleicht mit den
 * heutigen Preisen und legt das Ergebnis unter «Preisänderungen» ab. Geändert wird erst dort mit «Übernehmen».
 */
export default function PreisImportDialog({ onSchliessen }: { onSchliessen: (fertig: boolean) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const lieferanten = useLieferanten()
  const frueher = useImporte(true)
  const [quelle, setQuelle] = useState(ETURNITY)
  const [neuName, setNeuName] = useState('')
  const [datei, setDatei] = useState<string | null>(null)
  const [blatt, setBlatt] = useState<Blatt | null>(null)
  const [kopfzeile, setKopfzeile] = useState(0)
  const [zuordnung, setZuordnung] = useState<Zuordnung>({})
  const [vollstaendig, setVollstaendig] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [liest, setLiest] = useState(false)
  const anlegen = usePreisAenderung(legeImportAn)

  const lieferantId = quelle !== ETURNITY && quelle !== NEU ? quelle : null
  const quellName =
    quelle === ETURNITY
      ? 'Eturnity'
      : quelle === NEU
        ? neuName.trim()
        : (lieferanten.data?.find((l) => l.id === quelle)?.name ?? '')
  const kopf = blatt?.[kopfzeile] ?? []
  const zeilen = useMemo(() => {
    const z = blatt ? leseZeilen(blatt, kopfzeile, zuordnung) : []
    return quelle === NEU && quellName ? z.map((r) => ({ ...r, lieferant: quellName })) : z
  }, [blatt, kopfzeile, zuordnung, quelle, quellName])

  async function lies(f: File | undefined) {
    if (!f) return
    setFehler(null)
    setLiest(true)
    try {
      let b: Blatt
      if (/\.(csv|txt)$/i.test(f.name)) b = leseCsv(await f.text())
      else {
        const { default: leseExcel } = await import('read-excel-file/browser')
        // Erstes Blatt mit Zeilen; Eturnity und Lieferanten liefern die Liste im ersten Blatt.
        const blaetter = (await leseExcel(f)) as unknown as { sheet: string; data: Blatt }[]
        b = blaetter.find((x) => x.data.length > 1)?.data ?? []
      }
      const k = findeKopfzeile(b)
      const vorlage = frueher.data?.find((i) => i.quelle === quellName)?.zuordnung
      setDatei(f.name)
      setBlatt(b)
      setKopfzeile(k)
      setZuordnung(ausVorlage(b[k] ?? [], vorlage))
    } catch (e) {
      meldeFehler(e, 'preise.datei')
      setFehler(t('preise.datei.unlesbar'))
    } finally {
      setLiest(false)
    }
  }

  async function pruefen() {
    try {
      const namen: Record<string, string> = {}
      for (const f of IMPORT_FELDER) if (zuordnung[f] !== undefined) namen[f] = String(kopf[zuordnung[f]] ?? '').trim()
      const r = await anlegen.mutateAsync({
        quelle: quellName,
        lieferantId,
        dateiname: datei ?? '',
        zuordnung: namen,
        zeilen,
        vollstaendig,
      })
      melde('ok', zweisprachig('preise.datei.geprueft', { geaendert: r.geaendert ?? 0, neu: r.neu ?? 0 }))
      onSchliessen(true)
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (!s) meldeFehler(e, 'preise.datei')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  const spalten = [
    { wert: KEINE, text: t('preise.datei.keineSpalte') },
    ...kopf.map((k, i) => ({
      wert: String(i),
      text: String(k ?? '').trim() || t('preise.datei.spalteNr', { n: i + 1 }),
    })),
  ]
  const bereit = zeilen.length > 0 && quellName !== '' && zuordnung.ek !== undefined
  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen(false)
      }}
    >
      <DialogInhalt
        titel={t('preise.datei.titel')}
        beschreibung={t('preise.datei.beschreibung')}
        fuss={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                onSchliessen(false)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button disabled={!bereit} laedt={anlegen.isPending} onClick={() => void pruefen()}>
              <Upload />
              {t('preise.datei.pruefen', { count: zeilen.length })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id={`${id}-quelle`} label={t('preise.datei.quelle')}>
            <Auswahl
              id={`${id}-quelle`}
              value={quelle}
              onValueChange={setQuelle}
              optionen={[
                { wert: ETURNITY, text: t('preise.datei.eturnity') },
                ...(lieferanten.data ?? []).map((l) => ({ wert: l.id, text: l.name })),
                { wert: NEU, text: t('preise.datei.neuerLieferant') },
              ]}
            />
          </Feld>
          {quelle === NEU && (
            <Feld id={`${id}-name`} label={t('preise.datei.lieferantName')}>
              <Input
                id={`${id}-name`}
                value={neuName}
                onChange={(e) => {
                  setNeuName(e.target.value)
                }}
              />
            </Feld>
          )}
          <label className="hover:bg-muted/60 focus-within:ring-ring flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center focus-within:ring-2">
            <FileUp className="text-muted-foreground size-6" aria-hidden="true" />
            <span className="text-sm font-medium">
              {liest ? t('preise.import.liest') : (datei ?? t('preise.datei.waehlen'))}
            </span>
            <span className="text-muted-foreground text-xs">{t('preise.datei.formate')}</span>
            <input
              type="file"
              accept=".xlsx,.xlsm,.csv,.txt"
              className="sr-only"
              onChange={(e) => void lies(e.target.files?.[0])}
            />
          </label>

          {blatt && (
            <>
              <p className="text-muted-foreground text-xs">{t('preise.datei.zuordnung', { zeile: kopfzeile + 1 })}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {IMPORT_FELDER.map((f: ImportFeld) => (
                  <Feld key={f} id={`${id}-${f}`} label={t(`preise.datei.feld.${f}`)}>
                    <Auswahl
                      id={`${id}-${f}`}
                      value={zuordnung[f] === undefined ? KEINE : String(zuordnung[f])}
                      onValueChange={(w) => {
                        const rest = Object.fromEntries(Object.entries(zuordnung).filter(([x]) => x !== f)) as Zuordnung
                        setZuordnung(w === KEINE ? rest : { ...rest, [f]: Number(w) })
                      }}
                      optionen={spalten}
                    />
                  </Feld>
                ))}
              </div>
              {zeilen[0] && (
                <p className="bg-muted rounded-md p-2 text-xs">
                  {t('preise.datei.beispiel', {
                    nr: zeilen[0].artikelnummer || '–',
                    name: zeilen[0].name || '–',
                    ek: formatChf(zeilen[0].ek_rappen ?? 0),
                  })}
                </p>
              )}
              <label className="flex items-start gap-2 text-sm">
                <Switch
                  checked={vollstaendig}
                  onCheckedChange={setVollstaendig}
                  aria-label={t('preise.datei.vollstaendig')}
                />
                <span>
                  {t('preise.datei.vollstaendig')}
                  <span className="text-muted-foreground block text-xs">{t('preise.datei.vollstaendigHinweis')}</span>
                </span>
              </label>
            </>
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
