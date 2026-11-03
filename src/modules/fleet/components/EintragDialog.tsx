import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/fristen'
import { eintragSchema } from '../schema'
import { dateiHochladen } from '../services/dateien'
import { eintragErfassen } from '../services/ressourcen'

const MIT_ERGEBNIS = ['pruefung', 'kalibrierung', 'reparatur']
const MIT_NAECHSTER = ['mfk', 'service', 'pruefung', 'kalibrierung', 'reifen', 'vignette']

/** Eintrag-Arten mit Kosten, zu denen ein Beleg gehört (meist mit der Firmenkarte bezahlt). */
const MIT_BELEG = ['tanken', 'kosten', 'service', 'reparatur', 'reifen', 'vignette', 'mfk']

/** Beleg mit Datum und Art im Namen, z. B. «2026-11-03 tanken quittung.jpg». */
function belegName(f: File, datum: string, art: string): File {
  return new File([f], `${datum} ${art} ${f.name}`, { type: f.type })
}

/**
 * Eintrag erfassen (am Handy wie am PC): MFK, Service, Kilometerstand, Prüfung, Kalibrierung, Reparatur,
 * Schaden (mit Fotos), Tanken, Reifenwechsel, Vignette, übrige Kosten oder Notiz. Welche Arten es gibt, steht in der Auswahlliste «ressourcen_eintrag». Service und Prüfung
 * rechnen die nächste Frist selbst, wenn man sie leer lässt; ein Schaden meldet sich bei der Administration.
 */
export function EintragDialog({
  bezug,
  kmStand,
  startArt,
  onSchliessen,
}: {
  bezug: { fahrzeug?: string; geraet?: string }
  kmStand?: number | null
  startArt?: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const arten = useAuswahl('ressourcen_eintrag')
  const { laeuft, aus } = useAktion()
  const fuer = bezug.fahrzeug ? 'fahrzeug' : 'geraet'
  const moeglich = arten.werte.filter((a) => {
    const e = a.eigenschaften as { fuer?: string[]; automatisch?: boolean }
    return !e.automatisch && (e.fuer ?? []).includes(fuer)
  })
  // Eine id pro geöffnetem Fenster: ein zweiter Klick oder ein Netz-Wackler legt nichts doppelt an.
  const [id] = useState(() => crypto.randomUUID())
  const [art, setArt] = useState(startArt ?? (fuer === 'fahrzeug' ? 'km_stand' : 'pruefung'))
  const [datum, setDatum] = useState(heuteZuerich())
  const [km, setKm] = useState('')
  const [ergebnis, setErgebnis] = useState<'ok' | 'maengel' | ''>('')
  const [naechste, setNaechste] = useState('')
  const [kosten, setKosten] = useState('')
  const [text, setText] = useState('')
  const [liter, setLiter] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const kmZahl = km.trim() === '' ? null : Number(km.replace(/['\s]/g, ''))
  const pruefung = eintragSchema.safeParse({
    art,
    datum,
    km: kmZahl,
    ergebnis: ergebnis || null,
    naechste: naechste || null,
    kosten: kosten.trim() ? parseChf(kosten) : null,
  })

  async function speichern() {
    const ok = await aus(
      () =>
        eintragErfassen(
          {
            fahrzeug_id: bezug.fahrzeug ?? null,
            geraet_id: bezug.geraet ?? null,
            art,
            datum,
            km: kmZahl,
            kosten_rappen: kosten.trim() ? parseChf(kosten) : null,
            ergebnis: ergebnis || null,
            naechste: naechste || null,
            text: text.trim() || null,
            liter: liter.trim() ? Number(liter.replace(',', '.')) : null,
          },
          id,
        ).then(async () => {
          // Fotos nach dem Eintrag: beim Schaden in den Ordner des Eintrags (erscheinen beim Schaden). Belege
          // (Firmenkarte, Chris 3.11.2026) zu den Dokumenten des Fahrzeugs/Geräts, mit Datum und Art im Namen,
          // damit die Buchhaltung sie mit der Kartenabrechnung abgleichen kann.
          for (const f of fotos) {
            if (art === 'schaden') await dateiHochladen('eintrag', id, f)
            else if (bezug.fahrzeug) await dateiHochladen('fahrzeug', bezug.fahrzeug, belegName(f, datum, art))
            else if (bezug.geraet) await dateiHochladen('geraet', bezug.geraet, belegName(f, datum, art))
          }
        }),
      { de: 'Eintrag gespeichert', fr: 'Entrée enregistrée' },
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
        titel={t('fuhrpark.eintrag.titel')}
        beschreibung={t(`fuhrpark.eintrag.text.${fuer}`)}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!pruefung.success}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id="ei-art" label={t('fuhrpark.eintrag.art')} pflicht>
            <Auswahl
              id="ei-art"
              value={art}
              onValueChange={setArt}
              optionen={moeglich.map((a) => ({ wert: a.schluessel, text: arten.text(a.schluessel) }))}
            />
          </Feld>
          <Feld id="ei-datum" label={t('fuhrpark.eintrag.datum')} pflicht>
            <Input
              id="ei-datum"
              type="date"
              max={heuteZuerich()}
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          {fuer === 'fahrzeug' && (
            <Feld
              id="ei-km"
              label={t('fuhrpark.feld.km_stand')}
              pflicht={art === 'km_stand'}
              {...(kmStand != null
                ? { hinweis: t('fuhrpark.eintrag.bisher', { km: kmStand.toLocaleString('de-CH') }) }
                : {})}
            >
              <Input
                id="ei-km"
                inputMode="numeric"
                value={km}
                onChange={(e) => {
                  setKm(e.target.value)
                }}
              />
            </Feld>
          )}
          {fuer === 'geraet' && MIT_ERGEBNIS.includes(art) && (
            <Feld id="ei-ergebnis" label={t('fuhrpark.eintrag.ergebnis')} pflicht={art !== 'reparatur'}>
              <Auswahl
                id="ei-ergebnis"
                value={ergebnis}
                platzhalter={t('fuhrpark.eintrag.ergebnisWaehlen')}
                onValueChange={(v) => {
                  setErgebnis(v as 'ok' | 'maengel')
                }}
                optionen={(['ok', 'maengel'] as const).map((e) => ({ wert: e, text: t(`fuhrpark.ergebnis.${e}`) }))}
              />
            </Feld>
          )}
          {MIT_NAECHSTER.includes(art) && (
            <Feld
              id="ei-naechste"
              label={t(`fuhrpark.eintrag.naechste.${art}`)}
              pflicht={art === 'mfk'}
              hinweis={t(art === 'mfk' ? 'fuhrpark.eintrag.mfkHinweis' : 'fuhrpark.eintrag.automatisch')}
            >
              <Input
                id="ei-naechste"
                type="date"
                min={datum}
                value={naechste}
                onChange={(e) => {
                  setNaechste(e.target.value)
                }}
              />
            </Feld>
          )}
          {art === 'tanken' && (
            <Feld id="ei-liter" label={t('fuhrpark.eintrag.liter')}>
              <Input
                id="ei-liter"
                inputMode="decimal"
                value={liter}
                onChange={(e) => {
                  setLiter(e.target.value)
                }}
              />
            </Feld>
          )}
          {art !== 'km_stand' && art !== 'notiz' && (
            <Feld id="ei-kosten" label={t('fuhrpark.eintrag.kosten')} pflicht={art === 'tanken' || art === 'kosten'}>
              <Input
                id="ei-kosten"
                inputMode="decimal"
                placeholder="0.00"
                value={kosten}
                onChange={(e) => {
                  setKosten(e.target.value)
                }}
              />
            </Feld>
          )}
          <Feld id="ei-text" label={t('fuhrpark.eintrag.bemerkung')} className="sm:col-span-2">
            <Textarea
              id="ei-text"
              rows={2}
              {...(art === 'schaden' ? { placeholder: t('fuhrpark.eintrag.schadenBeispiel') } : {})}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
              }}
            />
          </Feld>
          {(art === 'schaden' || MIT_BELEG.includes(art)) && (
            <Feld
              id="ei-fotos"
              label={t(art === 'schaden' ? 'fuhrpark.schaden.fotos' : 'fuhrpark.eintrag.beleg')}
              className="sm:col-span-2"
              hinweis={t(art === 'schaden' ? 'fuhrpark.schaden.fotosHinweis' : 'fuhrpark.eintrag.belegHinweis')}
            >
              <Input
                id="ei-fotos"
                type="file"
                accept={art === 'schaden' ? 'image/*' : 'image/*,application/pdf'}
                capture="environment"
                multiple
                onChange={(e) => {
                  setFotos([...(e.target.files ?? [])])
                }}
              />
            </Feld>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
