import { ImagePlus, ShieldCheck, ShieldOff } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { KundeWahl, type GewaehlterKunde } from '@/components/shared/KundeWahl'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useKundenAnlagen, usePersonen } from '../hooks/useService'
import { laufendeGarantien } from '../lib/garantie'
import { fallSchema } from '../schema'
import { anhangHochladen, fallSpeichern } from '../services/service'
import { AUSWIRKUNGEN, KATEGORIEN, PRIORITAETEN } from '../types'

/** Vorbelegung, z. B. aus einer Mail im Posteingang. */
export interface FallVorlage {
  titel: string
  beschreibung: string
  kunde: GewaehlterKunde | null
  quelle?: string
  /** Anlage vorwählen (aus der Anlage-Akte). */
  anlageId?: string
}

const QUELLEN = ['anruf', 'mail', 'hand'] as const

/**
 * Neuen Service-Fall erfassen, wie am Telefon: Kunde und Anlage (Garantie wird sofort geprüft), was los ist und
 * wie schlimm, wer vor Ort öffnet, wer sich kümmert, Termin, Fotos. Die Reaktionszeit setzt die Datenbank.
 */
export function FallDialog({
  vorlage = null,
  onSchliessen,
  onErfasst,
}: {
  vorlage?: FallVorlage | null
  onSchliessen: () => void
  onErfasst: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const kat = useAuswahl('servicekategorie')
  const prio = useAuswahl('prioritaet')
  const wirkung = useAuswahl('serviceauswirkung')
  const quelle = useAuswahl('servicequelle')
  const komp = useAuswahl('komponente')
  const personen = usePersonen()
  const datei = useRef<HTMLInputElement>(null)
  const [fotos, setFotos] = useState<File[]>([])
  const [kunde, setKunde] = useState<GewaehlterKunde | null>(vorlage?.kunde ?? null)
  const anlagen = useKundenAnlagen(kunde?.id ?? null)
  const [w, setW] = useState({
    titel: vorlage?.titel ?? '',
    beschreibung: vorlage?.beschreibung ?? '',
    kategorie: 'stoerung',
    prioritaet: 'normal',
    garantie: false,
    anlage_id: vorlage?.anlageId ?? '',
    person_id: '',
    termin_am: '',
    quelle: vorlage?.quelle ?? (vorlage ? 'mail' : 'anruf'),
    auswirkung: '',
    komponente: '',
    fehlercode: '',
    vor_ort_name: '',
    vor_ort_telefon: '',
    zugang: '',
  })
  const [garantieVonHand, setGarantieVonHand] = useState(false)
  const [fehler, setFehler] = useState<Partial<Record<string, string>>>({})
  const anlage =
    (anlagen.data ?? []).find((a) => a.id === w.anlage_id) ?? (anlagen.data?.length === 1 ? anlagen.data[0] : undefined)
  const garantien = laufendeGarantien(anlage, w.komponente || null)
  const garantie = garantieVonHand ? w.garantie : garantien.length > 0
  const setze = (teil: Partial<typeof w>) => {
    setW((alt) => ({ ...alt, ...teil }))
  }

  async function speichern() {
    const g = fallSchema.safeParse({ ...w, garantie, anlage_id: anlage?.id ?? '', kontakt_id: kunde?.id ?? '' })
    if (!g.success) {
      setFehler(Object.fromEntries(g.error.issues.map((i) => [String(i.path[0]), t(i.message)])))
      return
    }
    const d = g.data
    let id = ''
    const ok = await aus(
      async () => {
        id = await fallSpeichern({
          titel: d.titel,
          beschreibung: d.beschreibung || null,
          kategorie: d.kategorie,
          prioritaet: d.auswirkung === 'steht' ? 'hoch' : d.prioritaet,
          garantie: d.garantie,
          status: d.termin_am ? 'termin' : 'neu',
          kontakt_id: d.kontakt_id,
          anlage_id: d.anlage_id || null,
          objekt_id: d.anlage_id ? null : (kunde?.objektId ?? null),
          person_id: d.person_id || null,
          termin_am: d.termin_am ? new Date(d.termin_am).toISOString() : null,
          quelle: d.quelle,
          auswirkung: d.auswirkung || null,
          komponente: d.komponente || null,
          fehlercode: d.fehlercode || null,
          vor_ort_name: d.vor_ort_name || null,
          vor_ort_telefon: d.vor_ort_telefon || null,
          zugang: d.zugang || null,
        })
        for (const f of fotos) await anhangHochladen(id, f)
      },
      { de: 'Fall erfasst', fr: 'Cas saisi' },
    )
    if (ok) onErfasst(id)
  }

  const feld = (name: keyof typeof w, label: string, typ = 'text') => (
    <Feld id={`sf-${name}`} label={label}>
      <Input
        id={`sf-${name}`}
        type={typ}
        value={String(w[name])}
        onChange={(e) => {
          setze({ [name]: e.target.value })
        }}
      />
    </Feld>
  )
  const wahl = (
    name: 'kategorie' | 'prioritaet' | 'komponente' | 'person_id',
    label: string,
    optionen: { wert: string; text: string }[],
  ) => (
    <Feld id={`sf-${name}`} label={label}>
      <Auswahl
        id={`sf-${name}`}
        value={w[name]}
        onValueChange={(v) => {
          setze({ [name]: v })
        }}
        optionen={optionen}
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
        titel={t('service.neu')}
        className="sm:max-w-2xl"
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Filterchips
              einzeln
              beschriftung={t('service.feld.quelle')}
              optionen={QUELLEN.map((q) => ({ wert: q, text: quelle.text(q) }))}
              gewaehlt={[w.quelle]}
              onChange={([q]) => {
                if (q) setze({ quelle: q })
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <Feld
              id="sf-kunde"
              label={t('service.feld.kunde')}
              pflicht
              {...(fehler.kontakt_id ? { fehler: fehler.kontakt_id } : {})}
            >
              <KundeWahl
                id="sf-kunde"
                wert={kunde}
                onWahl={(k) => {
                  setKunde(k)
                  setze({ anlage_id: '' })
                }}
              />
            </Feld>
          </div>
          {kunde && (anlagen.data ?? []).length > 1 && (
            <div className="sm:col-span-2">
              <Feld id="sf-anlage" label={t('service.feld.anlage')}>
                <Auswahl
                  id="sf-anlage"
                  value={w.anlage_id}
                  onValueChange={(v) => {
                    setze({ anlage_id: v })
                  }}
                  optionen={(anlagen.data ?? []).map((a) => ({
                    wert: a.id,
                    text: [a.adresse, a.leistung_kwp ? `${String(a.leistung_kwp)} kWp` : null, a.projekt]
                      .filter(Boolean)
                      .join(' · '),
                  }))}
                />
              </Feld>
            </div>
          )}
          {kunde && (
            <div
              className={`flex items-start gap-2 rounded-md p-2 text-sm sm:col-span-2 ${garantien.length > 0 ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground'}`}
            >
              {garantien.length > 0 ? (
                <ShieldCheck className="mt-0.5 size-4" aria-hidden="true" />
              ) : (
                <ShieldOff className="mt-0.5 size-4" aria-hidden="true" />
              )}
              <span className="flex-1">
                {!anlage
                  ? t('service.dialog.keineAnlage')
                  : garantien.length > 0
                    ? t('service.dialog.garantieLaeuft', {
                        liste: garantien
                          .map(
                            (g) =>
                              `${g.art ? komp.text(g.art) : t('service.garantieCheck.montage')} ${t('service.dialog.bis')} ${formatDatum(g.bis)}`,
                          )
                          .join(', '),
                      })
                    : t('service.dialog.garantieAbgelaufen')}
              </span>
              <label className="flex items-center gap-1.5 whitespace-nowrap">
                <Checkbox
                  checked={garantie}
                  onCheckedChange={(c) => {
                    setGarantieVonHand(true)
                    setze({ garantie: c === true })
                  }}
                />
                {t('service.feld.garantieFall')}
              </label>
            </div>
          )}
          <div className="sm:col-span-2">
            <Feld
              id="sf-titel"
              label={t('service.feld.titel')}
              pflicht
              {...(fehler.titel ? { fehler: fehler.titel } : {})}
            >
              <Input
                id="sf-titel"
                value={w.titel}
                onChange={(e) => {
                  setze({ titel: e.target.value })
                }}
              />
            </Feld>
          </div>
          <div className="sm:col-span-2">
            <Filterchips
              einzeln
              beschriftung={t('service.feld.auswirkung')}
              optionen={AUSWIRKUNGEN.map((a) => ({ wert: a, text: wirkung.text(a) }))}
              gewaehlt={w.auswirkung ? [w.auswirkung] : []}
              onChange={([a]) => {
                setze({ auswirkung: a ?? '', ...(a === 'steht' ? { prioritaet: 'hoch' } : {}) })
              }}
            />
          </div>
          {wahl(
            'kategorie',
            t('service.feld.kategorie'),
            KATEGORIEN.map((k) => ({ wert: k, text: kat.text(k) })),
          )}
          {wahl(
            'komponente',
            t('service.feld.komponente'),
            komp.werte.map((k) => ({ wert: k.schluessel, text: komp.text(k.schluessel) })),
          )}
          {feld('fehlercode', t('service.feld.fehlercode'))}
          {wahl(
            'prioritaet',
            t('service.feld.prioritaet'),
            PRIORITAETEN.map((p) => ({ wert: p, text: prio.text(p) })),
          )}
          {feld('vor_ort_name', t('service.feld.vorOrtName'))}
          {feld('vor_ort_telefon', t('service.feld.vorOrtTelefon'), 'tel')}
          <div className="sm:col-span-2">{feld('zugang', t('service.feld.zugang'))}</div>
          {wahl(
            'person_id',
            t('service.feld.zustaendig'),
            (personen.data ?? []).map((p) => ({ wert: p.id, text: p.name })),
          )}
          {feld('termin_am', t('service.feld.termin'), 'datetime-local')}
          <div className="sm:col-span-2">
            <Feld id="sf-text" label={t('service.feld.beschreibung')}>
              <Textarea
                id="sf-text"
                rows={3}
                value={w.beschreibung}
                onChange={(e) => {
                  setze({ beschreibung: e.target.value })
                }}
              />
            </Feld>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <input
              ref={datei}
              type="file"
              multiple
              accept="image/*,application/pdf"
              hidden
              aria-label={t('service.akte.hochladen')}
              onChange={(e) => {
                setFotos((alt) => [...alt, ...(e.target.files ?? [])])
                e.target.value = ''
              }}
            />
            <Button variant="secondary" size="sm" onClick={() => datei.current?.click()}>
              <ImagePlus />
              {t('service.dialog.fotos')}
            </Button>
            {fotos.map((f) => (
              <span key={f.name} className="bg-muted rounded px-2 py-0.5 text-xs">
                {f.name}
              </span>
            ))}
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
