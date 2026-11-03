import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../../hooks/useAktion'
import { usePersonen } from '../../hooks/useSubmission'
import { eckdatenSpeichern } from '../../services/submission'
import type { Dossier, Kriterium } from '../../types'

/** ISO-Zeitpunkt → Wert für <input type="datetime-local"> (Ortszeit). */
const lokal = (iso: string | null) => {
  if (!iso) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T12:00`
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const alsIso = (v: string) => (v ? new Date(v).toISOString() : '')
const JNL = (w: boolean | null) => (w == null ? '' : w ? 'ja' : 'nein')

/**
 * Eckdaten einer Submission bearbeiten: verantwortlich, Verfahren, Leistung, Schätzung, Ausführung, Fristen,
 * Zuschlagskriterien (zusammen 100 %), Varianten, ARGE, Eignung, Bindefrist, Eingabe-Adresse.
 */
export function EckdatenDialog({ d, onSchliessen }: { d: Dossier; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const personen = usePersonen().data ?? []
  const { laeuft, aus } = useAktion()
  const [fehler, setFehler] = useState<string | null>(null)
  const [w, setW] = useState({
    verantwortlich_id: d.verantwortlich_id ?? '',
    verfahren: d.verfahren ?? '',
    auftragsart: d.auftragsart ?? '',
    vergabestelle: d.vergabestelle ?? '',
    leistung_kwp: d.leistung_kwp?.toString() ?? '',
    schaetzung: d.schaetzung_rappen ? formatChf(d.schaetzung_rappen) : '',
    ausfuehrung_von: d.ausfuehrung_von ?? '',
    ausfuehrung_bis: d.ausfuehrung_bis ?? '',
    frist_fragen: d.frist_fragen?.slice(0, 10) ?? '',
    frist_begehung: lokal(d.frist_begehung),
    frist_eingabe: lokal(d.frist_eingabe ?? d.frist),
    frist_oeffnung: lokal(d.frist_oeffnung),
    zuschlag_erwartet: d.zuschlag_erwartet ?? '',
    varianten: JNL(d.varianten),
    arge: JNL(d.arge),
    eignung_ref_kwp: d.eignung_ref_kwp?.toString() ?? '',
    bindefrist_monate: d.bindefrist_monate?.toString() ?? '',
    eingabe_adresse: d.eingabe_adresse ?? '',
  })
  const [kriterien, setKriterien] = useState<Kriterium[]>(d.kriterien.length ? d.kriterien : [])
  const summe = kriterien.reduce((s, k) => s + (k.gewicht || 0), 0)
  const setze = (f: keyof typeof w, v: string) => {
    setW({ ...w, [f]: v })
  }

  async function speichern() {
    const schaetzung = w.schaetzung.trim() ? parseChf(w.schaetzung) : null
    if (w.schaetzung.trim() && schaetzung == null) {
      setFehler(t('ausschreibungen.eckdaten.betragUngueltig'))
      return
    }
    const k = kriterien.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), gewicht: x.gewicht || 0 }))
    if (k.length && k.reduce((s, x) => s + x.gewicht, 0) !== 100) {
      setFehler(t('ausschreibungen.eckdaten.summe'))
      return
    }
    const { varianten, arge, frist_begehung, frist_eingabe, frist_oeffnung, ...alle } = w
    const rest = Object.fromEntries(Object.entries(alle).filter(([k]) => k !== 'schaetzung'))
    const p = {
      ...rest,
      schaetzung_rappen: schaetzung?.toString() ?? '',
      varianten: varianten === '' ? null : varianten === 'ja',
      arge: arge === '' ? null : arge === 'ja',
      frist_begehung: alsIso(frist_begehung),
      frist_eingabe: alsIso(frist_eingabe),
      frist_oeffnung: alsIso(frist_oeffnung),
      kriterien: k,
    }
    if (p.varianten === null) delete (p as Partial<typeof p>).varianten
    if (p.arge === null) delete (p as Partial<typeof p>).arge
    if (await aus(() => eckdatenSpeichern(d.id, p), { de: 'Eckdaten gespeichert', fr: 'Données enregistrées' }))
      onSchliessen()
  }

  const text = (f: keyof typeof w, label: string, typ = 'text', extra: Record<string, string> = {}) => (
    <Feld id={`ek-${f}`} label={label}>
      <Input
        id={`ek-${f}`}
        type={typ}
        value={w[f]}
        {...extra}
        onChange={(e) => {
          setze(f, e.target.value)
        }}
      />
    </Feld>
  )
  const wahl = (f: keyof typeof w, label: string, werte: string[], praefix: string) => (
    <Feld id={`ek-${f}`} label={label}>
      <Auswahl
        id={`ek-${f}`}
        value={w[f]}
        platzhalter="–"
        onValueChange={(v) => {
          setze(f, v)
        }}
        optionen={werte.map((x) => ({ wert: x, text: t(`${praefix}.${x}`) }))}
      />
    </Feld>
  )

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
        titel={t('ausschreibungen.eckdaten.titel')}
        beschreibung={`${d.nummer} · ${d.titel}`}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} onClick={() => void speichern()}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <section className="grid gap-3 sm:grid-cols-2">
            <Feld id="ek-verantwortlich" label={t('ausschreibungen.feld.verantwortlich')}>
              <Auswahl
                id="ek-verantwortlich"
                value={w.verantwortlich_id}
                platzhalter="–"
                onValueChange={(v) => {
                  setze('verantwortlich_id', v)
                }}
                optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
              />
            </Feld>
            {text('vergabestelle', t('ausschreibungen.feld.vergabestelle'))}
            {wahl(
              'verfahren',
              t('ausschreibungen.feld.verfahren'),
              ['offen', 'selektiv', 'einladung', 'freihaendig'],
              'ausschreibungen.verfahren',
            )}
            {wahl(
              'auftragsart',
              t('ausschreibungen.feld.auftragsart'),
              ['bau', 'liefer', 'dienst'],
              'ausschreibungen.auftragsart',
            )}
            {text('leistung_kwp', t('ausschreibungen.feld.leistungKwp'), 'number', { min: '0', step: '0.1' })}
            {text('schaetzung', t('ausschreibungen.feld.schaetzungChf'), 'text', { inputMode: 'decimal' })}
            {text('ausfuehrung_von', t('ausschreibungen.feld.ausfuehrungVon'), 'date')}
            {text('ausfuehrung_bis', t('ausschreibungen.feld.ausfuehrungBis'), 'date')}
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            <h3 className="text-sm font-semibold sm:col-span-2">{t('ausschreibungen.akte.fristen')}</h3>
            {text('frist_fragen', t('ausschreibungen.feld.fristFragen'), 'date')}
            {text('frist_begehung', t('ausschreibungen.feld.fristBegehung'), 'datetime-local')}
            {text('frist_eingabe', t('ausschreibungen.feld.fristEingabe'), 'datetime-local')}
            {text('frist_oeffnung', t('ausschreibungen.feld.fristOeffnung'), 'datetime-local')}
            {text('zuschlag_erwartet', t('ausschreibungen.feld.zuschlagErwartet'), 'date')}
            {text('bindefrist_monate', t('ausschreibungen.feld.bindefrist'), 'number', { min: '0' })}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center justify-between text-sm font-semibold">
              {t('ausschreibungen.akte.kriterien')}
              <span className={summe === 100 || kriterien.length === 0 ? 'text-ok text-xs' : 'text-warn text-xs'}>
                {t('ausschreibungen.eckdaten.summeIst', { summe })}
              </span>
            </h3>
            {kriterien.map((k, i) => (
              <div key={i} className="grid grid-cols-[1fr_6rem_auto] items-center gap-1.5">
                <Input
                  aria-label={t('ausschreibungen.eckdaten.kriterium')}
                  placeholder={t('ausschreibungen.eckdaten.kriterium')}
                  value={k.name}
                  onChange={(e) => {
                    setKriterien(kriterien.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }}
                />
                <Input
                  aria-label={t('ausschreibungen.eckdaten.gewicht')}
                  type="number"
                  min={0}
                  max={100}
                  value={k.gewicht}
                  onChange={(e) => {
                    setKriterien(kriterien.map((x, j) => (j === i ? { ...x, gewicht: Number(e.target.value) } : x)))
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t('ausschreibungen.protokoll.entfernen')}
                  onClick={() => {
                    setKriterien(kriterien.filter((_, j) => j !== i))
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => {
                setKriterien([...kriterien, { name: '', gewicht: Math.max(0, 100 - summe) }])
              }}
            >
              <Plus />
              {t('ausschreibungen.eckdaten.kriteriumDazu')}
            </Button>
          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            <h3 className="text-sm font-semibold sm:col-span-2">{t('ausschreibungen.eckdaten.bedingungen')}</h3>
            {wahl('varianten', t('ausschreibungen.feld.varianten'), ['ja', 'nein'], 'ausschreibungen')}
            {wahl('arge', t('ausschreibungen.feld.arge'), ['ja', 'nein'], 'ausschreibungen')}
            {text('eignung_ref_kwp', t('ausschreibungen.feld.eignungKwp'), 'number', { min: '0' })}
            {text('eingabe_adresse', t('ausschreibungen.feld.eingabeAdresse'))}
          </section>
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
