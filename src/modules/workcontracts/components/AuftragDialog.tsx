import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf, parseChf } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import {
  useAuftragsOfferte,
  useStandorte,
  useVertragAenderung,
  useWerkvertragEinstellung,
} from '../hooks/useWerkvertraege'
import { vorschlagGegenstand, vorschlagMaterial } from '../lib/vertragInhalt'
import { berechneZahlungsplan, vorschlagKondition } from '../lib/zahlungsplan'
import { erstelleAuftrag } from '../services/werkvertraege'
import type { AuftragsOfferte, KonditionTranche, VertragAngaben } from '../types'
import { VertragFelder } from './VertragFelder'
import { ZahlungWahl } from './ZahlungWahl'

function heute(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function tranchenAus(eigenschaften: Record<string, unknown> | undefined): KonditionTranche[] {
  const roh = eigenschaften?.tranchen
  return Array.isArray(roh) ? (roh as KonditionTranche[]) : []
}

/** Formular, sobald die Offerte geladen ist (Startwerte hängen von ihr ab). */
function Formular({ o, onSchliessen }: { o: AuftragsOfferte; onSchliessen: (vertrag: string | null) => void }) {
  const { t } = useTranslation()
  const satz = useMwst()
  const standorte = useStandorte()
  const konditionen = useAuswahl('zahlungskondition')
  const einstellung = useWerkvertragEinstellung().data
  // Bearbeiten: Werte des bestehenden Vertrags; neu: Vorschläge aus Offerte und Einstellung.
  const alt = o.vertrag
  const [standortId, setStandortId] = useState(o.standortId ?? '')
  // Die Sprache folgt dem Standort (Bulle FR, Muri DE), bis man sie selbst wählt.
  const [sprache, setSprache] = useState<'de' | 'fr' | null>(null)
  const [kondition, setKondition] = useState(
    alt?.angaben.zahlung?.kondition ??
      vorschlagKondition(o, {
        pv: einstellung?.kondition_pv ?? 'normal',
        batterie: einstellung?.kondition_batterie ?? '70_30',
      }),
  )
  const [anzahlung, setAnzahlung] = useState(
    alt?.angaben.zahlung?.anzahlung_rappen ? formatChf(alt.angaben.zahlung.anzahlung_rappen) : '',
  )
  // Die Zahlung steht oben (eigene Felder), darum nicht in den Angaben.
  const [angaben, setAngaben] = useState<VertragAngaben>(() => {
    const kopie = { ...alt?.angaben }
    delete kopie.zahlung
    return kopie
  })
  const [wert, setWert] = useState(
    alt?.betragRappen ? formatChf(alt.betragRappen) : o.betragRappen ? formatChf(mitMwst(o.betragRappen, satz)) : '',
  )
  const [datum, setDatum] = useState(alt?.unterzeichnet ?? heute())
  const [mitVertrag, setMitVertrag] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const standort = standorte.data?.find((s) => s.id === standortId)
  const spracheJetzt = sprache ?? (standort?.sprache === 'fr' ? 'fr' : o.sprache)
  const rappen = parseChf(wert)
  const anzahlungRappen = kondition === 'anzahlung' ? parseChf(anzahlung) : null
  const tranchen = tranchenAus(konditionen.finde(kondition)?.eigenschaften)
  const vorschau =
    rappen && datum ? berechneZahlungsplan(rappen, tranchen, spracheJetzt, datum, null, anzahlungRappen) : []
  const fuerVorschlag = {
    kwp: o.kwp,
    anzahlModule: o.anzahlModule,
    batterie: o.batterie,
    wechselrichter: o.wechselrichter ?? null,
    titel: o.titel ?? null,
    sprache: spracheJetzt,
    objekt: { strasse: null, plz: null, ort: o.ort ?? null },
  }

  const speichern = useVertragAenderung(() =>
    erstelleAuftrag(o.id, {
      standort_id: standortId,
      sprache: spracheJetzt,
      kondition,
      vertragswert_rappen: rappen ?? 0,
      unterzeichnet_am: datum,
      werkvertrag: mitVertrag,
      anzahlung_rappen: anzahlungRappen,
      angaben,
    }),
  )

  async function absenden() {
    setFehler(null)
    if (!standortId || !rappen || !datum) {
      setFehler(t('werkvertraege.auftrag.pflicht'))
      return
    }
    if (kondition === 'anzahlung' && !anzahlungRappen) {
      setFehler(t('werkvertraege.auftrag.anzahlungFehlt'))
      return
    }
    try {
      const vertrag = await speichern.mutateAsync(undefined)
      melde('ok', zweisprachig('werkvertraege.auftrag.erstellt', { nummer: o.nummer }))
      onSchliessen(mitVertrag && vertrag ? vertrag : null)
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'werkvertraege.auftrag')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <DialogInhalt
      titel={t(alt ? 'werkvertraege.auftrag.bearbeiten' : 'werkvertraege.auftrag.titel')}
      beschreibung={`${o.nummer} · ${o.name}`}
      fuss={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              onSchliessen(null)
            }}
          >
            {t('allgemein.abbrechen')}
          </Button>
          <Button laedt={speichern.isPending} onClick={() => void absenden()}>
            <ClipboardCheck />
            {t(alt ? 'werkvertraege.auftrag.speichern' : 'werkvertraege.auftrag.erstellen')}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id="auftrag-standort" label={t('werkvertraege.auftrag.standort')} pflicht>
            <Auswahl
              id="auftrag-standort"
              value={standortId}
              onValueChange={setStandortId}
              optionen={(standorte.data ?? []).map((s) => ({ wert: s.id, text: s.name }))}
            />
          </Feld>
          <Feld id="auftrag-sprache" label={t('werkvertraege.auftrag.sprache')}>
            <Auswahl
              id="auftrag-sprache"
              value={spracheJetzt}
              onValueChange={(v) => {
                setSprache(v === 'fr' ? 'fr' : 'de')
              }}
              optionen={[
                { wert: 'de', text: 'Deutsch' },
                { wert: 'fr', text: 'Français' },
              ]}
            />
          </Feld>
          <Feld
            id="auftrag-wert"
            label={t('werkvertraege.auftrag.wert')}
            {...(o.betragRappen
              ? { hinweis: t('werkvertraege.auftrag.wertHinweis', { betrag: formatChf(o.betragRappen), satz }) }
              : {})}
            pflicht
          >
            <Input
              id="auftrag-wert"
              inputMode="decimal"
              value={wert}
              onChange={(e) => {
                setWert(e.target.value)
              }}
            />
          </Feld>
          <Feld id="auftrag-datum" label={t('werkvertraege.auftrag.datum')} pflicht>
            <Input
              id="auftrag-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
        </div>
        <AkteAbschnitt titel={t('werkvertraege.auftrag.zahlung')}>
          <ZahlungWahl
            kondition={kondition}
            anzahlung={anzahlung}
            vorschau={vorschau}
            onKondition={setKondition}
            onAnzahlung={setAnzahlung}
          />
        </AkteAbschnitt>
        {mitVertrag && (
          <AkteAbschnitt titel={t('werkvertraege.auftrag.imVertrag')}>
            <VertragFelder
              angaben={angaben}
              vorschlag={{ gegenstand: vorschlagGegenstand(fuerVorschlag), material: vorschlagMaterial(fuerVorschlag) }}
              batterie={!!o.batterie}
              onChange={setAngaben}
            />
          </AkteAbschnitt>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={mitVertrag}
            onCheckedChange={(an) => {
              setMitVertrag(an === true)
            }}
          />
          {t('werkvertraege.auftrag.mitVertrag')}
        </label>
        {fehler && (
          <p role="alert" className="text-bad text-sm">
            {fehler}
          </p>
        )}
      </form>
    </DialogInhalt>
  )
}

/**
 * «Auftrag erstellen» (V232) und «Vertrag bearbeiten»: Standort, Sprache, Vertragswert inkl. MWST, Datum der
 * Unterzeichnung, Zahlungsbedingung per Klick (mit Vorschau des Zahlungsplans) und was im Vertrag steht. Speichern legt Projekt, Zahlungsplan und
 * (wahlweise) den Werkvertrag an; die Offerte gilt danach als angenommen.
 */
export default function AuftragDialog({
  offerteId,
  onSchliessen,
}: {
  offerteId: string
  onSchliessen: (vertrag: string | null) => void
}) {
  const { t } = useTranslation()
  const offerte = useAuftragsOfferte(offerteId)
  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen(null)
      }}
    >
      {offerte.data ? (
        <Formular o={offerte.data} onSchliessen={onSchliessen} />
      ) : (
        <DialogInhalt titel={t('werkvertraege.auftrag.titel')}>
          {offerte.isPending ? (
            <Skelett className="h-64" />
          ) : (
            <p className="text-muted-foreground text-sm">{t('werkvertraege.auftrag.keineOfferte')}</p>
          )}
        </DialogInhalt>
      )}
    </Dialog>
  )
}
