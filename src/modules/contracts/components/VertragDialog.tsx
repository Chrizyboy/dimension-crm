import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KundeWahl, type GewaehlterKunde } from '@/components/shared/KundeWahl'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useKatalog, useKundenAnlagen } from '../hooks/useVertraege'
import { brauchtBestandsaufnahme, findePaket, stufeText, tarif } from '../lib/tarif'
import { vertragSchema, zahlAusFeld } from '../schema'
import { vertragSpeichern } from '../services/vertraege'
import { STATUS, type Bestandsaufnahme, type Vertrag } from '../types'
import { AnlageFelder, type AnlageAngaben } from './AnlageFelder'
import { BestandHinweis } from './BestandHinweis'
import { PaketWahl } from './PaketWahl'
import { PreisBox } from './PreisBox'

const zahl = (n: number | null | undefined) => (n == null ? '' : String(n))

/**
 * Wartungsvertrag nach den Paketen der Website anlegen oder ändern: Kunde und Anlage (vorgefüllt aus dem
 * Projekt), Paket (Essentiel, Comfort, Premium), Preis nach Anlagengrösse als Vorschlag, Bedingungen.
 * Nummer, Inspektions-Rhythmus und Preis inkl. MWST setzt die Datenbank.
 */
export function VertragDialog({
  vertrag: v,
  onSchliessen,
  onGespeichert,
}: {
  vertrag?: Vertrag
  onSchliessen: () => void
  onGespeichert: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const { laeuft, aus } = useAktion()
  const status = useAuswahl('wartungsstatus')
  const katalog = useKatalog().data ?? undefined
  const [kunde, setKunde] = useState<GewaehlterKunde | null>(
    v ? { id: v.kontakt_id, name: v.kunde, ort: v.ort, sprache: v.sprache, objektId: null } : null,
  )
  const anlagen = useKundenAnlagen(kunde?.id ?? null).data ?? []
  const [projektId, setProjektId] = useState(v?.projekt_id ?? '')
  const [anlage, setAnlage] = useState<AnlageAngaben>({
    anlage_id: v?.anlage_id ?? '',
    kwp: zahl(v?.anlage_kwp),
    speicher: zahl(v?.speicher_kwh),
    ibn: zahl(v?.ibn_jahr),
    wr: v?.wechselrichter ?? '',
    ort: v?.anlage_ort ?? '',
    fremd: v?.fremdanlage ?? false,
  })
  const [paket, setPaket] = useState<string | null>(v ? v.paket : 'comfort')
  const [preis, setPreis] = useState(v?.preis_netto_rappen != null ? formatChf(v.preis_netto_rappen) : '')
  const [preisVonHand, setPreisVonHand] = useState(Boolean(v))
  const [w, setW] = useState({
    start_am: v?.start_am ?? '',
    laufzeit_jahre: v?.laufzeit_jahre ?? 3,
    sprache: v?.sprache ?? 'de',
    status: v?.status ?? 'aktiv',
    notiz: v?.notiz ?? '',
  })
  const [bestand, setBestand] = useState<Bestandsaufnahme>(v?.bestandsaufnahme ?? 'keine')
  const [fehler, setFehler] = useState<Partial<Record<string, string>>>({})
  const sprache = i18n.language === 'fr' ? 'fr' : 'de'

  const kwp = zahlAusFeld(anlage.kwp)
  const kwpOk = kwp != null && !Number.isNaN(kwp) ? kwp : null
  const tarifRappen = katalog && paket ? tarif(katalog, paket, kwpOk) : null
  const p = findePaket(katalog, paket)
  // Solange niemand den Preis geändert hat, folgt er dem Tarif (Paket oder Grösse gewechselt).
  const preisText = preisVonHand ? preis : tarifRappen != null ? formatChf(tarifRappen) : preis
  const preisRappen = preisText.trim() ? parseChf(preisText) : null
  const ibn = zahlAusFeld(anlage.ibn)
  const bedingungen = katalog?.bedingungen
  const zeigeBestand =
    !!bedingungen &&
    !v?.verrechnet_bis &&
    brauchtBestandsaufnahme(
      anlage.fremd,
      ibn != null && !Number.isNaN(ibn) ? ibn : null,
      new Date().getFullYear(),
      bedingungen.bestandsaufnahme_ab_jahren,
    )
  const bestandWahl: Bestandsaufnahme = zeigeBestand ? (bestand === 'keine' ? 'verrechnen' : bestand) : bestand

  async function speichern() {
    const leistungen = p ? p.leistungen.map(({ de, fr }) => ({ de, fr })) : (v?.leistungen ?? [])
    const g = vertragSchema.safeParse({ ...w, kontakt_id: kunde?.id ?? '', paket, leistungen })
    const zahlen = {
      kwp: zahlAusFeld(anlage.kwp),
      speicher: zahlAusFeld(anlage.speicher),
      ibn: zahlAusFeld(anlage.ibn),
    }
    const f: Partial<Record<string, string>> = g.success
      ? {}
      : Object.fromEntries(g.error.issues.map((i) => [String(i.path[0]), t(i.message)]))
    for (const [k, n] of Object.entries(zahlen)) if (Number.isNaN(n)) f[k] = t('wartung.pruefung.zahl')
    if (paket && kwpOk == null) f.kwp = t('pruefung.pflicht')
    if (paket && preisRappen == null) f.preis = t('wartung.pruefung.betrag')
    if (!g.success || Object.keys(f).length > 0) {
      setFehler(f)
      return
    }
    let id = ''
    const ok = await aus(
      async () => {
        id = await vertragSpeichern(
          {
            kontakt_id: g.data.kontakt_id,
            projekt_id: projektId || anlagen.find((x) => x.id === anlage.anlage_id)?.projekt_id || null,
            anlage_id: anlage.anlage_id || null,
            paket,
            anlage_kwp: zahlen.kwp,
            speicher_kwh: zahlen.speicher,
            ibn_jahr: zahlen.ibn,
            wechselrichter: anlage.wr.trim() || null,
            anlage_ort: anlage.ort.trim() || null,
            fremdanlage: anlage.fremd,
            start_am: g.data.start_am,
            laufzeit_jahre: g.data.laufzeit_jahre,
            preis_netto_rappen: preisRappen,
            bestandsaufnahme: bestandWahl,
            sprache: g.data.sprache,
            status: g.data.status,
            notiz: g.data.notiz || null,
            leistungen: g.data.leistungen,
          },
          v?.id,
        )
      },
      v ? { de: 'Vertrag gespeichert', fr: 'Contrat enregistré' } : { de: 'Vertrag erfasst', fr: 'Contrat saisi' },
    )
    if (ok) onGespeichert(id)
  }

  const feld = (k: string) => (fehler[k] ? { fehler: fehler[k] } : {})

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
        titel={v ? t('wartung.bearbeiten', { nummer: v.nummer ?? '' }) : t('wartung.neu')}
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
        <div className="flex flex-col gap-5">
          <Feld id="wv-kunde" label={t('wartung.feld.kunde')} pflicht {...feld('kontakt_id')}>
            <KundeWahl
              id="wv-kunde"
              wert={kunde}
              onWahl={(k) => {
                setKunde(k)
                setProjektId('')
                setAnlage({ ...anlage, anlage_id: '' })
                setW({ ...w, sprache: k?.sprache === 'fr' ? 'fr' : 'de' })
              }}
            />
          </Feld>
          {kunde && (
            <AnlageFelder
              anlagen={anlagen}
              wert={anlage}
              fehler={fehler}
              onChange={(neu, x) => {
                setAnlage(neu)
                if (x) setProjektId(x.projekt_id ?? '')
              }}
            />
          )}
          {katalog && (
            <PaketWahl
              katalog={katalog}
              kwp={kwpOk}
              gewaehlt={paket}
              onWahl={(id) => {
                setPaket(id)
                setPreisVonHand(false)
              }}
            />
          )}
          {v && !v.paket && !paket && <p className="text-muted-foreground text-sm">{t('wartung.paket.alt')}</p>}
          {paket && katalog && (
            <PreisBox
              tarifRappen={tarifRappen}
              tarifText={t('wartung.preis.tarif', {
                paket: p?.name ?? '',
                stufe: stufeText(katalog.stufen_kwp, kwpOk, sprache === 'fr' ? 'kWc' : 'kWp'),
              })}
              wert={preisText}
              preisRappen={preisRappen}
              fehler={fehler.preis}
              onChange={(x) => {
                setPreis(x)
                setPreisVonHand(true)
              }}
            />
          )}
          {zeigeBestand && <BestandHinweis katalog={katalog} wert={bestandWahl} onChange={setBestand} />}
          <div className="grid gap-3 sm:grid-cols-3">
            <Feld id="wv-start" label={t('wartung.feld.start')} pflicht {...feld('start_am')}>
              <Input
                id="wv-start"
                type="date"
                value={w.start_am}
                onChange={(e) => {
                  setW({ ...w, start_am: e.target.value })
                }}
              />
            </Feld>
            <Feld id="wv-laufzeit" label={t('wartung.feld.laufzeit')} {...feld('laufzeit_jahre')}>
              <Input
                id="wv-laufzeit"
                type="number"
                min={1}
                max={20}
                value={w.laufzeit_jahre}
                onChange={(e) => {
                  setW({ ...w, laufzeit_jahre: Number(e.target.value) })
                }}
              />
            </Feld>
            <Feld id="wv-sprache" label={t('wartung.feld.sprache')}>
              <Auswahl
                id="wv-sprache"
                value={w.sprache}
                onValueChange={(s) => {
                  setW({ ...w, sprache: s === 'fr' ? 'fr' : 'de' })
                }}
                optionen={[
                  { wert: 'de', text: t('wartung.sprache.de') },
                  { wert: 'fr', text: t('wartung.sprache.fr') },
                ]}
              />
            </Feld>
          </div>
          {bedingungen && (
            <p className="text-muted-foreground -mt-2 text-xs">
              {t('wartung.bedingungen.kurz', {
                verl: bedingungen.verlaengerung_jahre,
                monate: bedingungen.kuendigung_monate,
                tage: bedingungen.zahlungsfrist_tage,
                vorlauf: bedingungen.rechnung_vorlauf_tage,
              })}
            </p>
          )}
          {v && (
            <Feld id="wv-status" label={t('wartung.feld.status')}>
              <Auswahl
                id="wv-status"
                value={w.status}
                onValueChange={(s) => {
                  setW({ ...w, status: s })
                }}
                optionen={STATUS.map((s) => ({ wert: s, text: status.text(s) }))}
              />
            </Feld>
          )}
          <Feld id="wv-notiz" label={t('wartung.feld.notiz')}>
            <Textarea
              id="wv-notiz"
              rows={3}
              value={w.notiz}
              onChange={(e) => {
                setW({ ...w, notiz: e.target.value })
              }}
            />
          </Feld>
          {fehler.leistungen && <p className="text-bad text-xs">{fehler.leistungen}</p>}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
