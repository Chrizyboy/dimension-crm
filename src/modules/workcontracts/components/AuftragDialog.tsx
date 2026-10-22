import { ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useAuftragsOfferte, useStandorte, useVertragAenderung } from '../hooks/useWerkvertraege'
import { berechneZahlungsplan, vorschlagKondition } from '../lib/zahlungsplan'
import { erstelleAuftrag } from '../services/werkvertraege'
import type { AuftragsOfferte, KonditionTranche } from '../types'
import { Zahlungsplan } from './Zahlungsplan'

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
  const [standortId, setStandortId] = useState(o.standortId ?? '')
  // Die Sprache folgt dem Standort (Bulle FR, Muri DE), bis man sie selbst wählt.
  const [sprache, setSprache] = useState<'de' | 'fr' | null>(null)
  const [kondition, setKondition] = useState(vorschlagKondition(o))
  const [wert, setWert] = useState(o.betragRappen ? formatChf(mitMwst(o.betragRappen, satz)) : '')
  const [datum, setDatum] = useState(heute())
  const [mitVertrag, setMitVertrag] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const standort = standorte.data?.find((s) => s.id === standortId)
  const spracheJetzt = sprache ?? (standort?.sprache === 'fr' ? 'fr' : o.sprache)
  const rappen = parseChf(wert)
  const tranchen = tranchenAus(konditionen.finde(kondition)?.eigenschaften)
  const vorschau = rappen && datum ? berechneZahlungsplan(rappen, tranchen, spracheJetzt, datum) : []

  const speichern = useVertragAenderung(() =>
    erstelleAuftrag(o.id, {
      standort_id: standortId,
      sprache: spracheJetzt,
      kondition,
      vertragswert_rappen: rappen ?? 0,
      unterzeichnet_am: datum,
      werkvertrag: mitVertrag,
    }),
  )

  async function absenden() {
    setFehler(null)
    if (!standortId || !rappen || !datum) {
      setFehler(t('werkvertraege.auftrag.pflicht'))
      return
    }
    try {
      const vertrag = await speichern.mutateAsync(undefined)
      melde('ok', zweisprachig('werkvertraege.auftrag.erstellt', { nummer: o.nummer }))
      onSchliessen(mitVertrag ? vertrag : null)
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'werkvertraege.auftrag')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <DialogInhalt
      titel={t('werkvertraege.auftrag.titel')}
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
            {t('werkvertraege.auftrag.erstellen')}
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
          <Feld id="auftrag-kondition" label={t('werkvertraege.auftrag.kondition')}>
            <Auswahl
              id="auftrag-kondition"
              value={kondition}
              onValueChange={setKondition}
              optionen={konditionen.werte.map((k) => ({ wert: k.schluessel, text: konditionen.text(k.schluessel) }))}
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
        <div>
          <h3 className="text-muted-foreground pb-1 text-xs font-medium">{t('werkvertraege.akte.zahlungsplan')}</h3>
          <Zahlungsplan tranchen={vorschau} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={mitVertrag}
            onCheckedChange={(an) => {
              setMitVertrag(an === true)
            }}
          />
          {t('werkvertraege.auftrag.mitVertrag')}
        </label>
        <p className="text-muted-foreground text-xs">{t('werkvertraege.auftrag.spaeter')}</p>
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
 * «Auftrag erstellen» (V232): Standort, Sprache, Zahlungskondition, Vertragswert inkl. MWST und Datum
 * der Unterzeichnung, mit Vorschau des Zahlungsplans. Speichern legt Projekt, Zahlungsplan und
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
