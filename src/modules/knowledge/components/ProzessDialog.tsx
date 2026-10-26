import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useHandbuch'
import { naechsteVersion, titelAusDateiname } from '../lib/handbuch'
import { prozessSchema } from '../schema'
import { speichereEintrag } from '../services/handbuch'
import type { HandbuchEintrag } from '../types'

const heute = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })

/**
 * Prozess ablegen oder neue Version hochladen (V233 przOpen/przSave). Titel aus dem Dateinamen vorgeschlagen,
 * Version wird hochgezählt, die französische Fassung ist freiwillig. Gleicher Titel = Fehler, dort «Neue Version».
 */
export function ProzessDialog({
  eintrag,
  vorhandene,
  onSchliessen,
}: {
  eintrag: HandbuchEintrag | null
  vorhandene: HandbuchEintrag[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [titel, setTitel] = useState(eintrag?.titel_de ?? '')
  const [beschreibung, setBeschreibung] = useState(eintrag?.beschreibung_de ?? '')
  const [version, setVersion] = useState(eintrag ? naechsteVersion(eintrag.version) : '1.0')
  const [datum, setDatum] = useState(heute())
  const [datei, setDatei] = useState<File | null>(null)
  const [titelFr, setTitelFr] = useState(eintrag?.titel_fr ?? '')
  const [beschreibungFr, setBeschreibungFr] = useState(eintrag?.beschreibung_fr ?? '')
  const [dateiFr, setDateiFr] = useState<File | null>(null)
  const [gezeigt, setGezeigt] = useState(false)

  const pruefung = prozessSchema.safeParse({ neu: !eintrag, titel_de: titel, datei_de: datei })
  const fehler = (feld: string) => {
    if (!gezeigt || pruefung.success) return undefined
    const f = pruefung.error.issues.find((i) => i.path[0] === feld)
    return f ? t(f.message) : undefined
  }
  const doppelt = !eintrag && vorhandene.some((e) => e.titel_de.trim().toLowerCase() === titel.trim().toLowerCase())
  const keinPdf = (f: File | null) => f !== null && !/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)

  async function speichern() {
    setGezeigt(true)
    if (!pruefung.success || doppelt || keinPdf(datei) || keinPdf(dateiFr)) return
    const ok = await aus(
      () =>
        speichereEintrag({
          id: eintrag?.id ?? null,
          art: 'prozess',
          titel_de: titel,
          beschreibung_de: beschreibung,
          titel_fr: titelFr,
          beschreibung_fr: beschreibungFr,
          version,
          datum,
          sprache: null,
          reihenfolge: null,
          datei_de: datei,
          datei_fr: dateiFr,
        }),
      eintrag
        ? { de: 'Neue Version gespeichert', fr: 'Nouvelle version enregistrée' }
        : { de: 'Prozess abgelegt', fr: 'Processus enregistré' },
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
        titel={
          eintrag ? t('handbuch.prozesse.neueVersionVon', { titel: eintrag.titel_de }) : t('handbuch.prozesse.neu')
        }
        beschreibung={eintrag ? t('handbuch.prozesse.neueVersionText') : t('handbuch.prozesse.neuText')}
        className="md:max-w-xl"
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld
            id="prozess-datei"
            label={t('handbuch.prozesse.datei')}
            pflicht={!eintrag}
            className="sm:col-span-2"
            fehler={fehler('datei_de') ?? (keinPdf(datei) ? t('handbuch.fehler.keinPdf') : undefined)}
            {...(eintrag?.datei_de ? { hinweis: t('handbuch.aktuell', { name: eintrag.datei_de.name }) } : {})}
          >
            <Input
              id="prozess-datei"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setDatei(f)
                if (f && !titel.trim()) setTitel(titelAusDateiname(f.name))
              }}
            />
          </Feld>
          <Feld
            id="prozess-titel"
            label={t('handbuch.titelFeld')}
            pflicht
            className="sm:col-span-2"
            fehler={fehler('titel_de') ?? (gezeigt && doppelt ? t('handbuch.fehler.doppelt') : undefined)}
          >
            <Input
              id="prozess-titel"
              placeholder={t('handbuch.prozesse.titelBeispiel')}
              value={titel}
              onChange={(e) => {
                setTitel(e.target.value)
              }}
            />
          </Feld>
          <Feld id="prozess-beschreibung" label={t('handbuch.beschreibungFeld')} className="sm:col-span-2">
            <Input
              id="prozess-beschreibung"
              placeholder={t('handbuch.prozesse.beschreibungBeispiel')}
              value={beschreibung}
              onChange={(e) => {
                setBeschreibung(e.target.value)
              }}
            />
          </Feld>
          <Feld id="prozess-version" label={t('handbuch.versionFeld')}>
            <Input
              id="prozess-version"
              placeholder="1.0"
              value={version}
              onChange={(e) => {
                setVersion(e.target.value)
              }}
            />
          </Feld>
          <Feld id="prozess-datum" label={t('handbuch.gueltigAb')}>
            <Input
              id="prozess-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <details className="rounded-md border p-3 sm:col-span-2" open={Boolean(eintrag?.datei_fr)}>
            <summary className="cursor-pointer text-sm font-medium">{t('handbuch.prozesse.franzoesisch')}</summary>
            <div className="mt-3 grid gap-4">
              <Feld id="prozess-titel-fr" label={t('handbuch.titelFr')}>
                <Input
                  id="prozess-titel-fr"
                  value={titelFr}
                  onChange={(e) => {
                    setTitelFr(e.target.value)
                  }}
                />
              </Feld>
              <Feld id="prozess-beschreibung-fr" label={t('handbuch.beschreibungFr')}>
                <Input
                  id="prozess-beschreibung-fr"
                  value={beschreibungFr}
                  onChange={(e) => {
                    setBeschreibungFr(e.target.value)
                  }}
                />
              </Feld>
              <Feld
                id="prozess-datei-fr"
                label={t('handbuch.prozesse.dateiFr')}
                fehler={keinPdf(dateiFr) ? t('handbuch.fehler.keinPdf') : undefined}
                {...(eintrag?.datei_fr ? { hinweis: t('handbuch.aktuell', { name: eintrag.datei_fr.name }) } : {})}
              >
                <Input
                  id="prozess-datei-fr"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    setDateiFr(e.target.files?.[0] ?? null)
                  }}
                />
              </Feld>
            </div>
          </details>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
