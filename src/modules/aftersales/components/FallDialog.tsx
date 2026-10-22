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
import { useAktion } from '../hooks/useAktion'
import { useKundenAnlagen, usePersonen } from '../hooks/useService'
import { fallSchema } from '../schema'
import { fallSpeichern } from '../services/service'
import { KATEGORIEN, PRIORITAETEN } from '../types'

/** Neuen Service-Fall erfassen: Kunde, Anlage, worum es geht, wie dringend, wer kümmert sich. */
export function FallDialog({ onSchliessen, onErfasst }: { onSchliessen: () => void; onErfasst: (id: string) => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const kat = useAuswahl('servicekategorie')
  const prio = useAuswahl('prioritaet')
  const personen = usePersonen()
  const [kunde, setKunde] = useState<GewaehlterKunde | null>(null)
  const anlagen = useKundenAnlagen(kunde?.id ?? null)
  const [w, setW] = useState({
    titel: '',
    beschreibung: '',
    kategorie: 'stoerung',
    prioritaet: 'normal',
    garantie: false,
    anlage_id: '',
    person_id: '',
    termin_am: '',
  })
  const [fehler, setFehler] = useState<Partial<Record<string, string>>>({})

  async function speichern() {
    const g = fallSchema.safeParse({ ...w, kontakt_id: kunde?.id ?? '' })
    if (!g.success) {
      setFehler(Object.fromEntries(g.error.issues.map((i) => [String(i.path[0]), t(i.message)])))
      return
    }
    let id = ''
    const ok = await aus(
      async () => {
        id = await fallSpeichern({
          titel: g.data.titel,
          beschreibung: g.data.beschreibung || null,
          kategorie: g.data.kategorie,
          prioritaet: g.data.prioritaet,
          garantie: g.data.garantie,
          status: 'neu',
          kontakt_id: g.data.kontakt_id,
          anlage_id: g.data.anlage_id || null,
          person_id: g.data.person_id || null,
          termin_am: g.data.termin_am || null,
        })
      },
      { de: 'Fall erfasst', fr: 'Cas saisi' },
    )
    if (ok) onErfasst(id)
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('service.neu')}
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
                  setW({ ...w, anlage_id: '' })
                }}
              />
            </Feld>
          </div>
          {kunde && (anlagen.data ?? []).length > 0 && (
            <div className="sm:col-span-2">
              <Feld id="sf-anlage" label={t('service.feld.anlage')}>
                <Auswahl
                  id="sf-anlage"
                  value={w.anlage_id}
                  onValueChange={(v) => {
                    setW({ ...w, anlage_id: v })
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
                  setW({ ...w, titel: e.target.value })
                }}
              />
            </Feld>
          </div>
          <Feld id="sf-kat" label={t('service.feld.kategorie')}>
            <Auswahl
              id="sf-kat"
              value={w.kategorie}
              onValueChange={(v) => {
                setW({ ...w, kategorie: v, garantie: v === 'garantie' || w.garantie })
              }}
              optionen={KATEGORIEN.map((k) => ({ wert: k, text: kat.text(k) }))}
            />
          </Feld>
          <Feld id="sf-prio" label={t('service.feld.prioritaet')}>
            <Auswahl
              id="sf-prio"
              value={w.prioritaet}
              onValueChange={(v) => {
                setW({ ...w, prioritaet: v })
              }}
              optionen={PRIORITAETEN.map((p) => ({ wert: p, text: prio.text(p) }))}
            />
          </Feld>
          <Feld id="sf-person" label={t('service.feld.zustaendig')}>
            <Auswahl
              id="sf-person"
              value={w.person_id}
              onValueChange={(v) => {
                setW({ ...w, person_id: v })
              }}
              optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
            />
          </Feld>
          <Feld id="sf-termin" label={t('service.feld.termin')}>
            <Input
              id="sf-termin"
              type="date"
              value={w.termin_am}
              onChange={(e) => {
                setW({ ...w, termin_am: e.target.value })
              }}
            />
          </Feld>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={w.garantie}
              onCheckedChange={(c) => {
                setW({ ...w, garantie: c === true })
              }}
            />
            {t('service.feld.garantieFall')}
          </label>
          <div className="sm:col-span-2">
            <Feld id="sf-text" label={t('service.feld.beschreibung')}>
              <Textarea
                id="sf-text"
                rows={4}
                value={w.beschreibung}
                onChange={(e) => {
                  setW({ ...w, beschreibung: e.target.value })
                }}
              />
            </Feld>
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
