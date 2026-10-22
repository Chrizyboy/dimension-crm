import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KundeWahl, type GewaehlterKunde } from '@/components/shared/KundeWahl'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useKatalog, useKundenProjekte } from '../hooks/useVertraege'
import { vertragSchema } from '../schema'
import { vertragSpeichern } from '../services/vertraege'
import { STATUS, type Leistung, type Vertrag } from '../types'

const RHYTHMEN = [6, 12, 24]

/**
 * Wartungsvertrag anlegen oder ändern: Kunde, Projekt, Start, Laufzeit, Rhythmus, Preis pro Jahr, Sprache
 * und die Leistungen aus dem Katalog (die üblichen sind vorgewählt). Die erste Wartung rechnet die Datenbank.
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
  const katalog = useKatalog()
  const [kunde, setKunde] = useState<GewaehlterKunde | null>(
    v ? { id: v.kontakt_id, name: v.kunde, ort: v.ort, sprache: v.sprache, objektId: null } : null,
  )
  const projekte = useKundenProjekte(kunde?.id ?? null)
  const [w, setW] = useState({
    projekt_id: v?.projekt_id ?? '',
    start_am: v?.start_am ?? '',
    laufzeit_jahre: v?.laufzeit_jahre ?? 3,
    rhythmus_monate: v?.rhythmus_monate ?? 12,
    preis: v?.preis_rappen ? formatChf(v.preis_rappen) : '',
    sprache: v?.sprache ?? ('de'),
    status: v?.status ?? 'aktiv',
    notiz: v?.notiz ?? '',
  })
  // Gewählte Leistungen über den deutschen Text; ohne Vertrag die Standard-Leistungen des Katalogs.
  const [gewaehlt, setGewaehlt] = useState<Set<string> | null>(v ? new Set(v.leistungen.map((l) => l.de)) : null)
  const [fehler, setFehler] = useState<Partial<Record<string, string>>>({})
  const liste: Leistung[] = [
    ...(katalog.data ?? []),
    ...(v?.leistungen ?? []).filter((l) => !(katalog.data ?? []).some((k) => k.de === l.de)),
  ]
  const istGewaehlt = (l: Leistung) => (gewaehlt ? gewaehlt.has(l.de) : Boolean(l.standard))
  const sprache = i18n.language === 'fr' ? 'fr' : 'de'

  async function speichern() {
    const leistungen = liste.filter(istGewaehlt).map(({ de, fr }) => ({ de, fr }))
    const g = vertragSchema.safeParse({ ...w, kontakt_id: kunde?.id ?? '', leistungen })
    const preis = w.preis.trim() ? parseChf(w.preis) : null
    if (!g.success || (w.preis.trim() && preis == null)) {
      setFehler({
        ...(g.success ? {} : Object.fromEntries(g.error.issues.map((i) => [String(i.path[0]), t(i.message)]))),
        ...(w.preis.trim() && preis == null ? { preis: t('wartung.pruefung.betrag') } : {}),
      })
      return
    }
    let id = ''
    const ok = await aus(
      async () => {
        id = await vertragSpeichern(
          {
            kontakt_id: g.data.kontakt_id,
            projekt_id: g.data.projekt_id || null,
            start_am: g.data.start_am,
            laufzeit_jahre: g.data.laufzeit_jahre,
            rhythmus_monate: g.data.rhythmus_monate,
            preis_rappen: preis,
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

  const feld = (k: keyof typeof w) => (fehler[k] ? { fehler: fehler[k] } : {})

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Feld
              id="wv-kunde"
              label={t('wartung.feld.kunde')}
              pflicht
              {...(fehler.kontakt_id ? { fehler: fehler.kontakt_id } : {})}
            >
              <KundeWahl
                id="wv-kunde"
                wert={kunde}
                onWahl={(k) => {
                  setKunde(k)
                  setW({ ...w, projekt_id: '', sprache: k?.sprache === 'fr' ? 'fr' : 'de' })
                }}
              />
            </Feld>
          </div>
          {kunde && (projekte.data ?? []).length > 0 && (
            <Feld id="wv-projekt" label={t('wartung.feld.projekt')}>
              <Auswahl
                id="wv-projekt"
                value={w.projekt_id}
                onValueChange={(p) => {
                  setW({ ...w, projekt_id: p })
                }}
                optionen={(projekte.data ?? []).map((p) => ({ wert: p.id, text: p.nummer }))}
              />
            </Feld>
          )}
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
          <Feld id="wv-rhythmus" label={t('wartung.feld.rhythmus')}>
            <Auswahl
              id="wv-rhythmus"
              value={String(w.rhythmus_monate)}
              onValueChange={(r) => {
                setW({ ...w, rhythmus_monate: Number(r) })
              }}
              optionen={[...new Set([...RHYTHMEN, w.rhythmus_monate])].map((m) => ({
                wert: String(m),
                text: t('wartung.rhythmus', { count: m }),
              }))}
            />
          </Feld>
          <Feld id="wv-preis" label={t('wartung.feld.preis')} {...feld('preis')}>
            <Input
              id="wv-preis"
              inputMode="decimal"
              placeholder="480.00"
              value={w.preis}
              onChange={(e) => {
                setW({ ...w, preis: e.target.value })
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
          <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">{t('wartung.feld.leistungen')}</legend>
            {liste.map((l) => (
              <label key={l.de} className="flex items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={istGewaehlt(l)}
                  onCheckedChange={(c) => {
                    const neu = new Set(liste.filter(istGewaehlt).map((x) => x.de))
                    if (c === true) neu.add(l.de)
                    else neu.delete(l.de)
                    setGewaehlt(neu)
                  }}
                />
                {l[sprache]}
              </label>
            ))}
            {fehler.leistungen && <p className="text-bad text-xs">{fehler.leistungen}</p>}
          </fieldset>
          <div className="sm:col-span-2">
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
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
